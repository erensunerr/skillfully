import crypto from "node:crypto";

import {
  sendSkillInviteEmail,
  type SkillInviteEmailParams,
  type SkillInviteEmailResult,
} from "@/lib/email/resend";
import {
  getSkillBySkillId,
  grantSkillAccess,
  listSkillAccessGrants,
  normalizeAccessEmail,
  requireSkillEditAccess,
  revokeSkillAccess,
  type SkillAccessGrantListItem,
  type SkillAccessGrantRow,
  type SkillAccessStore,
  type SkillPermission,
} from "@/lib/skills/access";
import { defaultSkillStore, type SkillRow } from "@/lib/skills/repository";

type SkillSharingDeps = {
  store: SkillAccessStore;
  now: () => number;
  idGenerator: () => string;
  sendInviteEmail: (params: SkillInviteEmailParams) => Promise<SkillInviteEmailResult>;
};

let testDeps: SkillSharingDeps | null = null;

export function setSkillSharingTestDeps(deps: SkillSharingDeps | null) {
  testDeps = deps;
}

function deps(): SkillSharingDeps {
  return testDeps ?? {
    store: defaultSkillStore,
    now: () => Date.now(),
    idGenerator: () => crypto.randomUUID(),
    sendInviteEmail: sendSkillInviteEmail,
  };
}

export function serializeSkillAccessGrant(grant: SkillAccessGrantRow | SkillAccessGrantListItem) {
  return {
    id: grant.id,
    email: grant.granteeEmail,
    user_id: grant.granteeUserId ?? null,
    permission: grant.permission,
    status: grant.status,
    is_owner: "isOwner" in grant ? grant.isOwner : false,
    can_revoke: "canRevoke" in grant ? grant.canRevoke : true,
    created_at: grant.createdAt,
    updated_at: grant.updatedAt,
    revoked_at: grant.revokedAt ?? null,
  };
}

export type ActorVisibleSkill = {
  skill: SkillRow;
  accessLevel: "owner" | "edit" | "use";
};

export async function listSkillsVisibleToActor({
  actorUserId,
  actorEmail,
}: {
  actorUserId: string;
  actorEmail?: string | null;
}): Promise<ActorVisibleSkill[]> {
  const config = deps();
  const ownedRows = await config.store.query({
    skills: {
      $: {
        where: {
          ownerId: actorUserId,
        },
      },
    },
  });
  const owned = (ownedRows.skills ?? []).map((row) => row as SkillRow);
  const bySkillId = new Map<string, ActorVisibleSkill>();
  for (const skill of owned) {
    bySkillId.set(skill.skillId, { skill, accessLevel: "owner" });
  }

  const normalizedEmail = normalizeAccessEmail(actorEmail);
  const grantQueries = await Promise.all([
    config.store.query({
      skillAccessGrants: {
        $: {
          where: {
            granteeUserId: actorUserId,
            status: "active",
          },
        },
      },
    }),
    normalizedEmail
      ? config.store.query({
          skillAccessGrants: {
            $: {
              where: {
                granteeEmail: normalizedEmail,
                status: "active",
              },
            },
          },
        })
      : Promise.resolve({ skillAccessGrants: [] as Record<string, unknown>[] }),
  ]);
  const grants = [...(grantQueries[0].skillAccessGrants ?? []), ...(grantQueries[1].skillAccessGrants ?? [])]
    .map((row) => row as SkillAccessGrantRow)
    .filter((grant, index, rows) => rows.findIndex((entry) => entry.id === grant.id) === index);

  for (const grant of grants) {
    if (bySkillId.has(grant.skillId)) {
      continue;
    }
    const skill = await getSkillBySkillId({ store: config.store, skillId: grant.skillId });
    if (!skill) {
      continue;
    }
    bySkillId.set(skill.skillId, { skill, accessLevel: grant.permission });
  }

  return [...bySkillId.values()].sort((a, b) => Number(b.skill.createdAt) - Number(a.skill.createdAt));
}

function notificationResponse(result: SkillInviteEmailResult) {
  if (result.status === "sent") {
    return {
      status: "sent" as const,
      resend_email_id: result.resendEmailId ?? null,
      error: null,
    };
  }
  return {
    status: "failed" as const,
    resend_email_id: null,
    error: result.error,
  };
}

async function createInviteNotification({
  deps,
  ownerId,
  skillId,
  grantId,
  toEmail,
  fromUserId,
  result,
}: {
  deps: SkillSharingDeps;
  ownerId: string;
  skillId: string;
  grantId: string;
  toEmail: string;
  fromUserId: string;
  result: SkillInviteEmailResult;
}) {
  const id = deps.idGenerator();
  const currentTime = deps.now();
  await deps.store.transact([
    deps.store.create("skillInviteNotifications", id, {
      ownerId,
      skillId,
      grantId,
      toEmail,
      fromUserId,
      deliveryStatus: result.status,
      ...(result.status === "sent" && result.resendEmailId ? { resendEmailId: result.resendEmailId } : {}),
      ...(result.status === "failed" ? { error: result.error } : {}),
      createdAt: currentTime,
      updatedAt: currentTime,
    }),
  ]);
}

export async function listSkillSharingGrants({
  skillId,
  actorUserId,
  actorEmail,
}: {
  skillId: string;
  actorUserId: string;
  actorEmail?: string | null;
}) {
  const config = deps();
  await requireSkillEditAccess({
    store: config.store,
    skillId,
    userId: actorUserId,
    email: actorEmail,
  });
  const grants = await listSkillAccessGrants({ store: config.store, skillId });
  return grants.map(serializeSkillAccessGrant);
}

export async function grantSkillSharingAccess({
  skillId,
  actorUserId,
  actorEmail,
  granteeEmail,
  permission,
  baseUrl,
}: {
  skillId: string;
  actorUserId: string;
  actorEmail?: string | null;
  granteeEmail: string;
  permission: SkillPermission;
  baseUrl: string;
}) {
  const config = deps();
  const grant = await grantSkillAccess({
    store: config.store,
    now: config.now,
    idGenerator: config.idGenerator,
    skillId,
    actorUserId,
    actorEmail,
    granteeEmail,
    permission,
  });
  const skill = await getSkillBySkillId({ store: config.store, skillId });
  if (!skill) {
    throw new Error("skill not found");
  }

  const notification = await config.sendInviteEmail({
    toEmail: grant.granteeEmail,
    skillName: skill.name,
    permission,
    sharedByEmail: actorEmail,
    dashboardUrl: `${baseUrl.replace(/\/+$/, "")}/dashboard/${skillId}/overview`,
  });
  await createInviteNotification({
    deps: config,
    ownerId: skill.ownerId,
    skillId,
    grantId: grant.id,
    toEmail: grant.granteeEmail,
    fromUserId: actorUserId,
    result: notification,
  });

  return {
    grant: serializeSkillAccessGrant(grant),
    notification: notificationResponse(notification),
  };
}

export async function updateSkillSharingGrant({
  skillId,
  grantId,
  actorUserId,
  actorEmail,
  permission,
}: {
  skillId: string;
  grantId: string;
  actorUserId: string;
  actorEmail?: string | null;
  permission: SkillPermission;
}) {
  if (grantId.startsWith("owner:")) {
    throw new Error("owner access cannot be changed");
  }
  if (permission !== "use" && permission !== "edit") {
    throw new Error("permission must be use or edit");
  }

  const config = deps();
  const access = await requireSkillEditAccess({
    store: config.store,
    skillId,
    userId: actorUserId,
    email: actorEmail,
  });
  const rows = await config.store.query({
    skillAccessGrants: {
      $: {
        where: {
          skillId,
          id: grantId,
        },
      },
    },
  });
  const existing = rows.skillAccessGrants?.[0] as SkillAccessGrantRow | undefined;
  if (!access.skill || !existing || existing.ownerId !== access.skill.ownerId) {
    throw new Error("grant not found");
  }

  const updates = {
    permission,
    updatedAt: config.now(),
  };
  await config.store.transact([config.store.update("skillAccessGrants", grantId, updates)]);
  return serializeSkillAccessGrant({
    ...existing,
    ...updates,
  });
}

export async function revokeSkillSharingGrant({
  skillId,
  grantId,
  actorUserId,
  actorEmail,
}: {
  skillId: string;
  grantId: string;
  actorUserId: string;
  actorEmail?: string | null;
}) {
  const config = deps();
  const grant = await revokeSkillAccess({
    store: config.store,
    now: config.now,
    skillId,
    actorUserId,
    actorEmail,
    grantId,
  });
  return serializeSkillAccessGrant(grant);
}

export function parseSkillSharingBody(body: { email?: unknown; permission?: unknown }) {
  const email = normalizeAccessEmail(String(body.email ?? ""));
  const permission = String(body.permission ?? "").trim().toLowerCase();
  if (!email) {
    throw new Error("email is required");
  }
  if (permission !== "use" && permission !== "edit") {
    throw new Error("permission must be use or edit");
  }
  return {
    email,
    permission: permission as SkillPermission,
  };
}
