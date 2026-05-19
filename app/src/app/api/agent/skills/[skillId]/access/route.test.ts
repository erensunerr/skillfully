import assert from "node:assert/strict";
import test from "node:test";

import { setAgentAuthorTestResolver } from "@/lib/agent-author-api";
import { setSkillSharingTestDeps } from "@/lib/skills/sharing";
import { GET as GET_SKILLS } from "../../route";
import { DELETE } from "./[grantId]/route";
import { POST } from "./route";

type Row = Record<string, unknown>;
type Op =
  | { kind: "create"; entity: string; id: string; values: Row }
  | { kind: "update"; entity: string; id: string; values: Row };

class InMemoryAgentSharingStore {
  rows: Record<string, Record<string, Row>> = {
    apiUsers: {
      owner: { email: "owner@example.com", createdAt: 1 },
      editor: { email: "editor@example.com", createdAt: 1 },
      user: { email: "user@example.com", createdAt: 1 },
    },
    skills: {
      owned: {
        ownerId: "editor",
        name: "Owned Skill",
        skillId: "sk_owned",
        slug: "owned-skill",
        status: "draft",
        visibility: "private",
        sourceMode: "managed",
        currentDraftVersionId: "draft-owned",
        createdAt: 1,
        updatedAt: 1,
      },
      shared: {
        ownerId: "owner",
        name: "Shared Skill",
        skillId: "sk_shared",
        slug: "shared-skill",
        status: "published",
        visibility: "private",
        sourceMode: "managed",
        currentDraftVersionId: "draft-shared",
        publishedVersionId: "published-shared",
        createdAt: 2,
        updatedAt: 2,
      },
    },
    skillAccessGrants: {
      "grant-editor": {
        ownerId: "owner",
        skillId: "sk_shared",
        granteeEmail: "editor@example.com",
        granteeUserId: "editor",
        permission: "edit",
        status: "active",
        createdByUserId: "owner",
        createdAt: 1,
        updatedAt: 1,
      },
      "grant-user": {
        ownerId: "owner",
        skillId: "sk_shared",
        granteeEmail: "user@example.com",
        granteeUserId: "user",
        permission: "use",
        status: "active",
        createdByUserId: "owner",
        createdAt: 1,
        updatedAt: 1,
      },
    },
    skillInviteNotifications: {},
  };

  create(entity: string, id: string, values: Row) {
    return { kind: "create" as const, entity, id, values };
  }

  update(entity: string, id: string, values: Row) {
    return { kind: "update" as const, entity, id, values };
  }

  async transact(ops: Op[]) {
    for (const op of ops) {
      this.rows[op.entity] ??= {};
      this.rows[op.entity][op.id] = {
        ...(this.rows[op.entity][op.id] ?? {}),
        ...op.values,
      };
    }
  }

  async query(query: Record<string, { $?: { where?: Record<string, unknown> } }>) {
    const result: Record<string, Row[]> = {};
    for (const [entity, options] of Object.entries(query)) {
      const where = options.$?.where ?? {};
      result[entity] = Object.entries(this.rows[entity] ?? {})
        .map(([id, values]) => ({ id, ...values }) as Row)
        .filter((row) => Object.entries(where).every(([key, value]) => row[key] === value));
    }
    return result;
  }
}

function routeContext(skillId = "sk_shared", grantId = "grant-user") {
  return {
    params: Promise.resolve({ skillId, grantId }),
  };
}

function agentRequest(token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  return new Request("https://www.skillfully.sh/api/agent/skills/sk_shared/access", {
    ...init,
    headers,
  }) as never;
}

function useAgentSharingStore(sendStatus: "sent" | "failed" = "sent") {
  const store = new InMemoryAgentSharingStore();
  let id = 0;
  setAgentAuthorTestResolver(async (request) => {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (token === "editor-token") return { ownerId: "editor", email: "editor@example.com" };
    if (token === "use-token") return { ownerId: "user", email: "user@example.com" };
    return null;
  });
  setSkillSharingTestDeps({
    store,
    now: () => 100,
    idGenerator: () => `id-${++id}`,
    sendInviteEmail: async () =>
      sendStatus === "sent"
        ? { status: "sent", resendEmailId: "email-1" }
        : { status: "failed", error: "resend unavailable" },
  });
  return store;
}

test.afterEach(() => {
  setAgentAuthorTestResolver(null);
  setSkillSharingTestDeps(null);
});

test("agent list includes skills shared with edit access", async () => {
  useAgentSharingStore();

  const response = await GET_SKILLS(agentRequest("editor-token"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(
    body.skills.map((skill: { skill_id: string; access_level: string }) => [skill.skill_id, skill.access_level]),
    [["sk_shared", "edit"], ["sk_owned", "owner"]],
  );
});

test("agent can grant use access by skill_id", async () => {
  const store = useAgentSharingStore();

  const response = await POST(
    agentRequest("editor-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", permission: "use" }),
    }),
    routeContext(),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.grant.email, "new@example.com");
  assert.equal(body.notification.status, "sent");
  assert.equal(Object.keys(store.rows.skillInviteNotifications).length, 1);
});

test("agent can revoke non-owner grant", async () => {
  const store = useAgentSharingStore();

  const response = await DELETE(
    agentRequest("editor-token", { method: "DELETE" }),
    routeContext("sk_shared", "grant-user"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.grant.status, "revoked");
  assert.equal(store.rows.skillAccessGrants["grant-user"].status, "revoked");
});

test("agent with use-only access cannot grant access", async () => {
  useAgentSharingStore();

  const response = await POST(
    agentRequest("use-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", permission: "use" }),
    }),
    routeContext(),
  );
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, "skill not found");
});

test("agent responses include email delivery warning without failing grant", async () => {
  useAgentSharingStore("failed");

  const response = await POST(
    agentRequest("editor-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", permission: "edit" }),
    }),
    routeContext(),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.grant.permission, "edit");
  assert.equal(body.notification.status, "failed");
});
