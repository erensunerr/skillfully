import crypto from "node:crypto";

import { defaultSkillStore, type SkillRow, type SkillStore } from "./repository";

export type SkillAccessLevel = "owner" | "edit" | "use" | "none";
export type SkillPermission = "use" | "edit";
export type SkillGrantStatus = "active" | "revoked";

type Row = Record<string, unknown>;

export type SkillAccessStore = Pick<SkillStore, "query" | "create" | "update" | "transact">;

export type SkillAccessGrantRow = {
  id: string;
  ownerId: string;
  skillId: string;
  granteeEmail: string;
  granteeUserId?: string;
  permission: SkillPermission;
  status: SkillGrantStatus;
  createdByUserId: string;
  revokedByUserId?: string;
  createdAt: number;
  updatedAt: number;
  revokedAt?: number;
};

export type SkillAccessGrantListItem = SkillAccessGrantRow & {
  isOwner: boolean;
  canRevoke: boolean;
};

export type SkillAccessResult = {
  level: SkillAccessLevel;
  skill: SkillRow | null;
  grant?: SkillAccessGrantRow;
  ownerId?: string;
  canUse: boolean;
  canEdit: boolean;
  canManageSharing: boolean;
};

function rowWithId<T extends Row>(row: T): T & { id: string } {
  return row as T & { id: string };
}

export function normalizeAccessEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function assertPermission(value: SkillPermission): asserts value is SkillPermission {
  if (value !== "use" && value !== "edit") {
    throw new Error("permission must be use or edit");
  }
}

function accessResult(
  level: SkillAccessLevel,
  skill: SkillRow | null,
  grant?: SkillAccessGrantRow,
): SkillAccessResult {
  const canEdit = level === "owner" || level === "edit";
  const canUse = canEdit || level === "use";
  return {
    level,
    skill,
    ...(skill ? { ownerId: skill.ownerId } : {}),
    ...(grant ? { grant } : {}),
    canUse,
    canEdit,
    canManageSharing: canEdit,
  };
}

function asSkill(row: Row | undefined): SkillRow | null {
  return row ? rowWithId(row) as SkillRow : null;
}

function asGrant(row: Row): SkillAccessGrantRow {
  return rowWithId(row) as SkillAccessGrantRow;
}

export async function getSkillBySkillId({
  store = defaultSkillStore,
  skillId,
}: {
  store?: SkillAccessStore;
  skillId: string;
}) {
  const rows = await store.query({
    skills: {
      $: {
        where: {
          skillId,
        },
      },
    },
  });
  return asSkill(rows.skills?.[0]);
}

async function userEmailForId({
  store,
  userId,
}: {
  store: SkillAccessStore;
  userId: string;
}) {
  try {
    const rows = await store.query({
      apiUsers: {
        $: {
          where: {
            id: userId,
          },
        },
      },
    });
    const email = rows.apiUsers?.[0]?.email;
    return typeof email === "string" ? normalizeAccessEmail(email) : null;
  } catch {
    return null;
  }
}

async function activeGrantsForSkill({
  store,
  skillId,
}: {
  store: SkillAccessStore;
  skillId: string;
}) {
  const rows = await store.query({
    skillAccessGrants: {
      $: {
        where: {
          skillId,
        },
      },
    },
  });
  return (rows.skillAccessGrants ?? [])
    .map(asGrant)
    .filter((grant) => grant.status === "active");
}

export async function resolveSkillAccess({
  store = defaultSkillStore,
  skillId,
  userId,
  email,
}: {
  store?: SkillAccessStore;
  skillId: string;
  userId: string;
  email?: string | null;
}): Promise<SkillAccessResult> {
  const skill = await getSkillBySkillId({ store, skillId });
  if (!skill) {
    return accessResult("none", null);
  }
  if (skill.ownerId === userId) {
    return accessResult("owner", skill);
  }

  const normalizedEmail = normalizeAccessEmail(email) || await userEmailForId({ store, userId }) || "";
  const grants = await activeGrantsForSkill({ store, skillId });
  const grant = grants
    .filter((entry) => {
      return entry.granteeUserId === userId ||
        (normalizedEmail.length > 0 && normalizeAccessEmail(entry.granteeEmail) === normalizedEmail);
    })
    .sort((a, b) => {
      if (a.permission === b.permission) {
        return Number(b.updatedAt) - Number(a.updatedAt);
      }
      return a.permission === "edit" ? -1 : 1;
    })[0];

  if (!grant) {
    return accessResult("none", skill);
  }
  return accessResult(grant.permission, skill, grant);
}

export async function requireSkillUseAccess(params: {
  store?: SkillAccessStore;
  skillId: string;
  userId: string;
  email?: string | null;
}) {
  const access = await resolveSkillAccess(params);
  if (!access.canUse || !access.skill) {
    throw new Error("skill not found");
  }
  return access;
}

export async function requireSkillEditAccess(params: {
  store?: SkillAccessStore;
  skillId: string;
  userId: string;
  email?: string | null;
}) {
  const access = await resolveSkillAccess(params);
  if (!access.canEdit || !access.skill) {
    throw new Error("skill not found");
  }
  return access;
}

export async function grantSkillAccess({
  store = defaultSkillStore,
  now = () => Date.now(),
  idGenerator = () => crypto.randomUUID(),
  skillId,
  actorUserId,
  actorEmail,
  granteeEmail,
  granteeUserId,
  permission,
}: {
  store?: SkillAccessStore;
  now?: () => number;
  idGenerator?: () => string;
  skillId: string;
  actorUserId: string;
  actorEmail?: string | null;
  granteeEmail: string;
  granteeUserId?: string | null;
  permission: SkillPermission;
}) {
  assertPermission(permission);
  const actorAccess = await requireSkillEditAccess({
    store,
    skillId,
    userId: actorUserId,
    email: actorEmail,
  });
  const skill = actorAccess.skill;
  if (!skill) {
    throw new Error("skill not found");
  }

  const normalizedEmail = normalizeAccessEmail(granteeEmail);
  if (!normalizedEmail) {
    throw new Error("grantee email is required");
  }

  const existingRows = await store.query({
    skillAccessGrants: {
      $: {
        where: {
          skillId,
          granteeEmail: normalizedEmail,
        },
      },
    },
  });
  const existing = existingRows.skillAccessGrants?.[0] ? asGrant(existingRows.skillAccessGrants[0]) : null;
  const currentTime = now();

  if (existing) {
    const updates = {
      permission,
      status: "active",
      ...(granteeUserId ? { granteeUserId } : {}),
      revokedByUserId: undefined,
      revokedAt: undefined,
      updatedAt: currentTime,
    };
    await store.transact([store.update("skillAccessGrants", existing.id, updates)]);
    return {
      ...existing,
      ...updates,
    } as SkillAccessGrantRow;
  }

  const id = idGenerator();
  const grant: SkillAccessGrantRow = {
    id,
    ownerId: skill.ownerId,
    skillId,
    granteeEmail: normalizedEmail,
    ...(granteeUserId ? { granteeUserId } : {}),
    permission,
    status: "active",
    createdByUserId: actorUserId,
    createdAt: currentTime,
    updatedAt: currentTime,
  };
  await store.transact([store.create("skillAccessGrants", id, withoutId(grant))]);
  return grant;
}

export async function revokeSkillAccess({
  store = defaultSkillStore,
  now = () => Date.now(),
  skillId,
  actorUserId,
  actorEmail,
  grantId,
}: {
  store?: SkillAccessStore;
  now?: () => number;
  skillId: string;
  actorUserId: string;
  actorEmail?: string | null;
  grantId: string;
}) {
  if (grantId.startsWith("owner:")) {
    throw new Error("owner access cannot be revoked");
  }
  const actorAccess = await requireSkillEditAccess({
    store,
    skillId,
    userId: actorUserId,
    email: actorEmail,
  });
  const skill = actorAccess.skill;
  if (!skill) {
    throw new Error("skill not found");
  }

  const rows = await store.query({
    skillAccessGrants: {
      $: {
        where: {
          skillId,
          id: grantId,
        },
      },
    },
  });
  const grant = rows.skillAccessGrants?.[0] ? asGrant(rows.skillAccessGrants[0]) : null;
  if (!grant || grant.ownerId !== skill.ownerId) {
    throw new Error("grant not found");
  }
  if (grant.granteeUserId === skill.ownerId) {
    throw new Error("owner access cannot be revoked");
  }

  const currentTime = now();
  const updates = {
    status: "revoked",
    revokedByUserId: actorUserId,
    revokedAt: currentTime,
    updatedAt: currentTime,
  };
  await store.transact([store.update("skillAccessGrants", grant.id, updates)]);
  return {
    ...grant,
    ...updates,
  } as SkillAccessGrantRow;
}

export async function listSkillAccessGrants({
  store = defaultSkillStore,
  skillId,
}: {
  store?: SkillAccessStore;
  skillId: string;
}): Promise<SkillAccessGrantListItem[]> {
  const skill = await getSkillBySkillId({ store, skillId });
  if (!skill) {
    throw new Error("skill not found");
  }
  const ownerEmail = await userEmailForId({ store, userId: skill.ownerId });
  const ownerGrant: SkillAccessGrantListItem = {
    id: `owner:${skillId}`,
    ownerId: skill.ownerId,
    skillId,
    granteeEmail: ownerEmail ?? "",
    granteeUserId: skill.ownerId,
    permission: "edit",
    status: "active",
    createdByUserId: skill.ownerId,
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
    isOwner: true,
    canRevoke: false,
  };
  const grants = await activeGrantsForSkill({ store, skillId });
  return [
    ownerGrant,
    ...grants
      .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
      .map((grant) => ({
        ...grant,
        isOwner: false,
        canRevoke: true,
      })),
  ];
}

function withoutId<T extends { id: string }>(row: T) {
  const { id: _id, ...values } = row;
  return values;
}
