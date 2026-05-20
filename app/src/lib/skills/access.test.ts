import assert from "node:assert/strict";
import test from "node:test";

import {
  grantSkillAccess,
  listSkillAccessGrants,
  requireSkillEditAccess,
  requireSkillUseAccess,
  resolveSkillAccess,
  revokeSkillAccess,
} from "./access";

type Row = Record<string, unknown>;
type Op =
  | { kind: "create"; entity: string; id: string; values: Row }
  | { kind: "update"; entity: string; id: string; values: Row };

class InMemoryAccessStore {
  rows: Record<string, Record<string, Row>> = {
    apiUsers: {
      "user-1": { email: "owner@example.com", createdAt: 1 },
      "user-2": { email: "editor@example.com", createdAt: 1 },
      "user-3": { email: "user@example.com", createdAt: 1 },
    },
    skills: {
      skill_row: {
        ownerId: "user-1",
        name: "Shared Skill",
        skillId: "sk_demo",
        slug: "shared-skill",
        status: "published",
        visibility: "private",
        sourceMode: "managed",
        currentDraftVersionId: "version-1",
        createdAt: 1,
        updatedAt: 1,
      },
    },
    skillAccessGrants: {},
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

test("owner has implicit edit and use access", async () => {
  const store = new InMemoryAccessStore();

  const access = await resolveSkillAccess({
    store,
    skillId: "sk_demo",
    userId: "user-1",
    email: "owner@example.com",
  });

  assert.equal(access.level, "owner");
  assert.equal(access.canUse, true);
  assert.equal(access.canEdit, true);
  assert.equal(access.canManageSharing, true);
  assert.equal(access.skill?.ownerId, "user-1");
});

test("edit grants imply use and can manage sharing", async () => {
  const store = new InMemoryAccessStore();

  await grantSkillAccess({
    store,
    now: () => 100,
    idGenerator: () => "grant-1",
    skillId: "sk_demo",
    actorUserId: "user-1",
    granteeEmail: " EDITOR@example.com ",
    permission: "edit",
  });

  const access = await resolveSkillAccess({
    store,
    skillId: "sk_demo",
    userId: "user-2",
    email: "editor@example.com",
  });

  assert.equal(access.level, "edit");
  assert.equal(access.canUse, true);
  assert.equal(access.canEdit, true);
  assert.equal(access.canManageSharing, true);
  await assert.doesNotReject(() =>
    requireSkillUseAccess({
      store,
      skillId: "sk_demo",
      userId: "user-2",
      email: "editor@example.com",
    }),
  );
});

test("use grants do not allow edit or share management", async () => {
  const store = new InMemoryAccessStore();

  await grantSkillAccess({
    store,
    now: () => 100,
    idGenerator: () => "grant-1",
    skillId: "sk_demo",
    actorUserId: "user-1",
    granteeEmail: "user@example.com",
    permission: "use",
  });

  const access = await resolveSkillAccess({
    store,
    skillId: "sk_demo",
    userId: "user-3",
    email: "user@example.com",
  });

  assert.equal(access.level, "use");
  assert.equal(access.canUse, true);
  assert.equal(access.canEdit, false);
  assert.equal(access.canManageSharing, false);
  await assert.rejects(
    () =>
      requireSkillEditAccess({
        store,
        skillId: "sk_demo",
        userId: "user-3",
        email: "user@example.com",
      }),
    /skill not found/,
  );
});

test("revoked grants resolve as none", async () => {
  const store = new InMemoryAccessStore();

  const grant = await grantSkillAccess({
    store,
    now: () => 100,
    idGenerator: () => "grant-1",
    skillId: "sk_demo",
    actorUserId: "user-1",
    granteeEmail: "user@example.com",
    permission: "use",
  });
  await revokeSkillAccess({
    store,
    now: () => 200,
    skillId: "sk_demo",
    actorUserId: "user-1",
    grantId: grant.id,
  });

  const access = await resolveSkillAccess({
    store,
    skillId: "sk_demo",
    userId: "user-3",
    email: "user@example.com",
  });

  assert.equal(access.level, "none");
  assert.equal(access.canUse, false);
});

test("editors cannot revoke the owner", async () => {
  const store = new InMemoryAccessStore();

  await assert.rejects(
    () =>
      revokeSkillAccess({
        store,
        now: () => 100,
        skillId: "sk_demo",
        actorUserId: "user-2",
        grantId: "owner:sk_demo",
      }),
    /owner access cannot be revoked/,
  );
});

test("email grants work before granteeUserId is known", async () => {
  const store = new InMemoryAccessStore();

  await grantSkillAccess({
    store,
    now: () => 100,
    idGenerator: () => "grant-1",
    skillId: "sk_demo",
    actorUserId: "user-1",
    granteeEmail: "new-person@example.com",
    permission: "edit",
  });

  const access = await resolveSkillAccess({
    store,
    skillId: "sk_demo",
    userId: "user-new",
    email: " New-Person@example.com ",
  });

  assert.equal(access.level, "edit");
  assert.equal(access.grant?.granteeUserId, undefined);
});

test("grantSkillAccess reactivates existing revoked grants", async () => {
  const store = new InMemoryAccessStore();

  const first = await grantSkillAccess({
    store,
    now: () => 100,
    idGenerator: () => "grant-1",
    skillId: "sk_demo",
    actorUserId: "user-1",
    granteeEmail: "user@example.com",
    permission: "use",
  });
  await revokeSkillAccess({
    store,
    now: () => 200,
    skillId: "sk_demo",
    actorUserId: "user-1",
    grantId: first.id,
  });
  const second = await grantSkillAccess({
    store,
    now: () => 300,
    idGenerator: () => "grant-2",
    skillId: "sk_demo",
    actorUserId: "user-1",
    granteeEmail: "user@example.com",
    permission: "edit",
  });

  assert.equal(second.id, first.id);
  assert.equal(second.status, "active");
  assert.equal(second.permission, "edit");
  assert.equal(second.revokedAt, undefined);
});

test("listSkillAccessGrants includes a synthetic owner row and active grants", async () => {
  const store = new InMemoryAccessStore();

  await grantSkillAccess({
    store,
    now: () => 100,
    idGenerator: () => "grant-1",
    skillId: "sk_demo",
    actorUserId: "user-1",
    granteeEmail: "user@example.com",
    permission: "use",
  });

  const grants = await listSkillAccessGrants({ store, skillId: "sk_demo" });

  assert.equal(grants.length, 2);
  assert.deepEqual(grants.map((grant) => grant.permission), ["edit", "use"]);
  assert.equal(grants[0].id, "owner:sk_demo");
  assert.equal(grants[0].isOwner, true);
  assert.equal(grants[0].canRevoke, false);
});
