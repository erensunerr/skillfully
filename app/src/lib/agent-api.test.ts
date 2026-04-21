import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiError,
  confirmLoginCode,
  createTrackedSkill,
  listFeedbackForSkill,
  requestLoginCode,
} from "./agent-api";

type EntityRow = Record<string, unknown>;
type EntityName =
  | "apiUsers"
  | "apiLoginCodes"
  | "apiTokens"
  | "apiLoginAttempts"
  | "skills"
  | "feedback";

type Op =
  | {
      kind: "create";
      entity: EntityName;
      id: string;
      values: EntityRow;
    }
  | {
      kind: "update";
      entity: EntityName;
      id: string;
      values: EntityRow;
    }
  | {
      kind: "delete";
      entity: EntityName;
      id: string;
    };

class InMemoryApiStore {
  rows: Record<EntityName, Record<string, EntityRow>> = {
    apiUsers: {},
    apiLoginCodes: {},
    apiTokens: {},
    apiLoginAttempts: {},
    skills: {},
    feedback: {},
  };
  pendingOps: Op[] = [];

  private queryRows(entity: EntityName, where?: Record<string, unknown>) {
    const rows = Object.entries(this.rows[entity]).map(([id, record]) => ({
      id,
      ...record,
    }));
    if (!where) {
      return rows;
    }

    const keys = Object.keys(where);
    return rows.filter((row) =>
      keys.every((key) => row[key] === where[key]),
    );
  }

  async query(query: { [key: string]: { $?: { where?: Record<string, unknown> } } }) {
    const result: Record<string, EntityRow[]> = {};
    for (const [entity, value] of Object.entries(query)) {
      const rows = this.queryRows(entity as EntityName, value?.$?.where);
      result[entity] = rows;
    }
    return result;
  }

  create(entity: EntityName, id: string, values: EntityRow) {
    const op = { kind: "create" as const, entity, id, values };
    this.pendingOps.push(op);
    return op;
  }

  update(entity: EntityName, id: string, values: EntityRow) {
    const op = { kind: "update" as const, entity, id, values };
    this.pendingOps.push(op);
    return op;
  }

  delete(entity: EntityName, id: string) {
    const op = { kind: "delete" as const, entity, id };
    this.pendingOps.push(op);
    return op;
  }

  async transact(ops: Op[]) {
    for (const op of ops) {
      const store = this.rows[op.entity];
      if (op.kind === "create") {
        store[op.id] = { ...(store[op.id] ?? {}), ...op.values };
        continue;
      }

      if (op.kind === "update") {
        store[op.id] = { ...(store[op.id] ?? {}), ...op.values };
        continue;
      }

      delete store[op.id];
    }
  }

  async queryById(entity: EntityName, id: string) {
    return this.rows[entity][id];
  }
}

function buildDeps({
  sendLoginCode = async () => undefined,
  now = () => 1700000000000,
  readTemplate = async () => "# Skillfully feedback\\nhttps://feedback/{{feedbackUrl}}",
}: {
  sendLoginCode?: (params: { email: string; code: string }) => Promise<void> | void;
  now?: () => number;
  readTemplate?: () => Promise<string>;
} = {}) {
  const store = new InMemoryApiStore();
  let idCounter = 0;
  const idGenerator = () => `id_${++idCounter}`;
  const codeGenerator = () => "123456";
  const tokenGenerator = () => `token_${idCounter + 10}`;
  return {
    store,
    deps: {
      db: store,
      now,
      idGenerator,
      codeGenerator,
      tokenGenerator,
      sendLoginCode,
      readTemplate,
    },
  };
}

test("requestLoginCode creates a user and login code when valid email provided", async () => {
  const sent: string[] = [];
  const { store, deps } = buildDeps({
    sendLoginCode: async ({ code }) => {
      sent.push(code);
    },
  });

  const result = await requestLoginCode({ email: "Agent@Test.Com" }, deps);

  assert.equal(result.email, "agent@test.com");
  assert.equal(sent[0], "123456");
  const users = await store.query({ apiUsers: { $: { where: { email: "agent@test.com" } } } });
  const usersRows = users.apiUsers as Array<{ id: string; email: string }>;

  assert.equal(usersRows.length, 1);
  assert.equal(usersRows[0].email, "agent@test.com");

  const loginRows = await store.query({
    apiLoginCodes: { $: { where: { userId: usersRows[0].id } } },
  });
  assert.equal((loginRows.apiLoginCodes as unknown[]).length, 1);
});

test("requestLoginCode enforces cooldown before issuing another code to the same email", async () => {
  let now = 1700000000000;
  const { store, deps } = buildDeps({
    now: () => now,
    sendLoginCode: async () => undefined,
  });

  await requestLoginCode(
    {
      email: "cooldown@test.com",
      ipHash: "ip_hash",
    },
    deps,
  );

  await assert.rejects(async () => {
    await requestLoginCode(
      {
        email: "cooldown@test.com",
        ipHash: "ip_hash",
      },
      {
        ...deps,
        now: () => now + 30_000,
      },
    );
  }, (error: unknown) => error instanceof ApiError);

  now = now + 61_000;
  const second = await requestLoginCode(
    {
      email: "cooldown@test.com",
      ipHash: "ip_hash",
    },
    {
      ...deps,
      now: () => now,
    },
  );
  const users = await store.query({
    apiUsers: { $: { where: { email: "cooldown@test.com" } } },
  });
  assert.equal(users.apiUsers.length, 1);
  assert.equal(second.email, "cooldown@test.com");
});

test("confirmLoginCode issues token only when code matches", async () => {
  const { store, deps } = buildDeps({
    sendLoginCode: async ({ code }) => {
      return Promise.resolve();
    },
  });

  await requestLoginCode({ email: "agent2@test.com" }, deps);
  const confirmResult = await confirmLoginCode({
    email: "agent2@test.com",
    code: "123456",
  }, deps);

  assert.equal(confirmResult.tokenType, "Bearer");

  const tokens = await store.query({
    apiTokens: { $: { where: { userId: confirmResult.userId } } },
  });
  assert.equal((tokens.apiTokens as unknown[]).length, 1);
});

test("confirmLoginCode rate limits repeated invalid attempts from the same IP", async () => {
  const { deps } = buildDeps({
    sendLoginCode: async () => undefined,
  });

  await requestLoginCode({
    email: "badcode@test.com",
    ipHash: "ip_hash",
  }, deps);

  for (let index = 0; index < 30; index += 1) {
    await assert.rejects(async () => {
      await confirmLoginCode(
        {
          email: "badcode@test.com",
          code: "000000",
          ipHash: "ip_hash",
        },
        deps,
      );
    }, (error: unknown) => error instanceof ApiError);
  }

  await assert.rejects(async () => {
    await confirmLoginCode(
      {
        email: "badcode@test.com",
        code: "000000",
        ipHash: "ip_hash",
      },
      deps,
    );
  }, (error: unknown) => error instanceof ApiError);
});

test("createTrackedSkill requires a valid token and returns runtime feedback snippet", async () => {
  const { store, deps } = buildDeps({
    sendLoginCode: async () => undefined,
    readTemplate: async () => "# Skillfully feedback\\n{{feedbackUrl}}",
  });
  await requestLoginCode({ email: "agent3@test.com" }, deps);
  const confirm = await confirmLoginCode({
    email: "agent3@test.com",
    code: "123456",
  }, deps);
  const result = await createTrackedSkill(
    {
      token: confirm.token,
      name: "Code Reviewer",
      description: "Used by the API",
      baseUrl: "https://www.skillfully.sh",
    },
    deps,
  );

  assert.ok(result.skillId.startsWith("sk_"));
  assert.equal(result.feedbackUrl, `https://www.skillfully.sh/feedback/${result.skillId}`);
  assert.equal(result.snippet.includes(result.feedbackUrl), true);
});

test("listFeedbackForSkill filters, sorts, and paginates", async () => {
  const { store, deps } = buildDeps({
    sendLoginCode: async () => undefined,
  });

  await requestLoginCode({ email: "agent4@test.com" }, deps);
  const confirm = await confirmLoginCode({ email: "agent4@test.com", code: "123456" }, deps);
  const created = await createTrackedSkill(
    {
      token: confirm.token,
      name: "Sorter",
      baseUrl: "https://www.skillfully.sh",
    },
    deps,
  );

  await store.transact([
    {
      kind: "create",
      entity: "feedback",
      id: "fb_1",
      values: {
        ownerId: confirm.userId,
        skillId: created.skillId,
        rating: "positive",
        feedback: "first",
        createdAt: 10,
      },
    },
    {
      kind: "create",
      entity: "feedback",
      id: "fb_2",
      values: {
        ownerId: confirm.userId,
        skillId: created.skillId,
        rating: "negative",
        feedback: "second",
        createdAt: 10,
      },
    },
    {
      kind: "create",
      entity: "feedback",
      id: "fb_3",
      values: {
        ownerId: confirm.userId,
        skillId: created.skillId,
        rating: "positive",
        feedback: "third",
        createdAt: 20,
      },
    },
  ]);

  const first = await listFeedbackForSkill(
    {
      token: confirm.token,
      skillId: created.skillId,
      sort: "desc",
      limit: "2",
    },
    deps,
  );

  assert.equal(first.items.length, 2);
  assert.equal(first.items[0].id, "fb_3");
  assert.equal(first.hasMore, true);
  assert.equal(first.nextCursor, "10:fb_2");

  const second = await listFeedbackForSkill(
    {
      token: confirm.token,
      skillId: created.skillId,
      sort: "desc",
      limit: "2",
      cursor: String(first.nextCursor),
    },
    deps,
  );
  assert.equal(second.items.length, 1);
  assert.equal(second.items[0].id, "fb_1");
});

test("listFeedbackForSkill validates rating filter values", async () => {
  const { deps } = buildDeps({
    sendLoginCode: async () => undefined,
  });

  await requestLoginCode({ email: "agent5@test.com" }, deps);
  const confirm = await confirmLoginCode({
    email: "agent5@test.com",
    code: "123456",
  }, deps);

  await assert.rejects(async () => {
    await listFeedbackForSkill(
      {
        token: confirm.token,
        skillId: "bad",
        rating: "meh",
      },
      deps,
    );
  }, (error: unknown) => error instanceof ApiError);
});
