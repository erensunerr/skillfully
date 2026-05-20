import assert from "node:assert/strict";
import test from "node:test";

import { setSkillSharingTestDeps } from "@/lib/skills/sharing";
import { DELETE } from "./[grantId]/route";
import { GET, POST } from "./route";

type Row = Record<string, unknown>;
type Op =
  | { kind: "create"; entity: string; id: string; values: Row }
  | { kind: "update"; entity: string; id: string; values: Row };

class InMemorySharingStore {
  rows: Record<string, Record<string, Row>> = {
    apiUsers: {
      owner: { email: "owner@example.com", createdAt: 1 },
      editor: { email: "editor@example.com", createdAt: 1 },
      user: { email: "user@example.com", createdAt: 1 },
    },
    skills: {
      skill: {
        ownerId: "owner",
        name: "Private Skill",
        skillId: "sk_demo",
        slug: "private-skill",
        status: "published",
        visibility: "private",
        sourceMode: "managed",
        currentDraftVersionId: "draft-1",
        publishedVersionId: "published-1",
        createdAt: 1,
        updatedAt: 1,
      },
    },
    skillAccessGrants: {
      "grant-editor": {
        ownerId: "owner",
        skillId: "sk_demo",
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
        skillId: "sk_demo",
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

function routeContext(skillId = "sk_demo", grantId = "grant-user") {
  return {
    params: Promise.resolve({ skillId, grantId }),
  };
}

function dashboardRequest(userId: string, email: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-skillfully-preview-user-id", userId);
  headers.set("x-skillfully-preview-user-email", email);
  return new Request("https://www.skillfully.sh/api/dashboard/skills/sk_demo/access", {
    ...init,
    headers,
  }) as never;
}

function useSharingStore(sendStatus: "sent" | "failed" = "sent") {
  const store = new InMemorySharingStore();
  let id = 0;
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
  setSkillSharingTestDeps(null);
});

test("owner can list grants", async () => {
  useSharingStore();

  const response = await GET(dashboardRequest("owner", "owner@example.com"), routeContext());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.grants.length, 3);
  assert.equal(body.grants[0].is_owner, true);
  assert.equal(body.grants[1].email, "editor@example.com");
});

test("editor can grant use access and receives sent notification status", async () => {
  const store = useSharingStore();

  const response = await POST(
    dashboardRequest("editor", "editor@example.com", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: " New@Example.com ", permission: "use" }),
    }),
    routeContext(),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.grant.email, "new@example.com");
  assert.equal(body.notification.status, "sent");
  assert.equal(Object.keys(store.rows.skillInviteNotifications).length, 1);
});

test("editor can grant edit access with delivery warning when Resend fails", async () => {
  useSharingStore("failed");

  const response = await POST(
    dashboardRequest("editor", "editor@example.com", {
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
  assert.match(body.notification.error, /resend unavailable/);
});

test("use-only user cannot list grants", async () => {
  useSharingStore();

  const response = await GET(dashboardRequest("user", "user@example.com"), routeContext());
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, "skill not found");
});

test("editor cannot revoke owner", async () => {
  useSharingStore();

  const response = await DELETE(
    dashboardRequest("editor", "editor@example.com", { method: "DELETE" }),
    routeContext("sk_demo", "owner:sk_demo"),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /owner access cannot be revoked/);
});

test("editor can revoke non-owner grant", async () => {
  const store = useSharingStore();

  const response = await DELETE(
    dashboardRequest("editor", "editor@example.com", { method: "DELETE" }),
    routeContext("sk_demo", "grant-user"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.grant.status, "revoked");
  assert.equal(store.rows.skillAccessGrants["grant-user"].status, "revoked");
});
