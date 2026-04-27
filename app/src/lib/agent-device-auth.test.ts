import assert from "node:assert/strict";
import test from "node:test";

import { ApiError, resolveTokenOwner } from "./agent-api";
import {
  agentDeviceAuthInternals,
  approveAgentDeviceAuthorization,
  createAgentDeviceAuthorization,
  exchangeAgentDeviceCode,
  type AgentDeviceAuthStore,
} from "./agent-device-auth";

type Row = Record<string, unknown>;
type Entity = "agentDeviceCodes" | "apiTokens";
type Op =
  | { kind: "create"; entity: Entity; id: string; values: Row }
  | { kind: "update"; entity: Entity; id: string; values: Row };

class InMemoryDeviceStore implements AgentDeviceAuthStore {
  rows: Record<Entity, Record<string, Row>> = {
    agentDeviceCodes: {},
    apiTokens: {},
  };

  create(entity: Entity, id: string, values: Row) {
    return { kind: "create" as const, entity, id, values };
  }

  update(entity: Entity, id: string, values: Row) {
    return { kind: "update" as const, entity, id, values };
  }

  async transact(ops: unknown[]) {
    for (const op of ops as Op[]) {
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
      result[entity] = Object.entries(this.rows[entity as Entity])
        .map(([id, values]) => ({ id, ...values }))
        .filter((row) => Object.entries(where).every(([key, value]) => row[key] === value));
    }
    return result;
  }
}

function deps(store: InMemoryDeviceStore, now = () => 1700000000000) {
  let idCounter = 0;
  return {
    store,
    now,
    idGenerator: () => `id_${++idCounter}`,
    deviceCodeGenerator: () => "device-secret",
    userCodeGenerator: () => "ABCD-EFGH",
    tokenGenerator: () => "issued-token",
  };
}

test("device auth creates a human approval code and exchanges it after approval", async () => {
  const store = new InMemoryDeviceStore();
  const config = deps(store);

  const started = await createAgentDeviceAuthorization({
    agentName: "Codex",
    baseUrl: "https://www.skillfully.sh",
  }, config);

  assert.equal(started.userCode, "ABCD-EFGH");
  assert.equal(started.verificationUriComplete, "https://www.skillfully.sh/agent-auth?code=ABCD-EFGH");

  await assert.rejects(
    () => exchangeAgentDeviceCode({ deviceCode: "device-secret" }, config),
    (error: unknown) => error instanceof ApiError && error.status === 428,
  );

  const approved = await approveAgentDeviceAuthorization({
    userCode: "abcd efgh",
    ownerId: "human-user",
  }, config);
  assert.equal(approved.status, "approved");

  const token = await exchangeAgentDeviceCode({ deviceCode: "device-secret" }, config);
  assert.equal(token.token, "issued-token");
  assert.equal(token.ownerId, "human-user");

  const owner = await resolveTokenOwner("issued-token", {
    now: () => 1700000000000,
    db: {
      query: store.query.bind(store),
      create: store.create.bind(store) as never,
      update: store.update.bind(store) as never,
      delete: (() => undefined) as never,
      transact: store.transact.bind(store) as never,
    },
  });
  assert.equal(owner.userId, "human-user");
});

test("device auth expires pending codes", async () => {
  const store = new InMemoryDeviceStore();
  const config = deps(store);
  await createAgentDeviceAuthorization({
    agentName: "Codex",
    baseUrl: "https://www.skillfully.sh",
  }, config);

  await assert.rejects(
    () =>
      approveAgentDeviceAuthorization(
        {
          userCode: "ABCD-EFGH",
          ownerId: "human-user",
        },
        {
          ...config,
          now: () => 1700000000000 + 16 * 60_000,
        },
      ),
    (error: unknown) => error instanceof ApiError && error.status === 410,
  );

  const codeHash = agentDeviceAuthInternals.hashValue("ABCD-EFGH");
  const code = Object.values(store.rows.agentDeviceCodes).find((row) => row.userCodeHash === codeHash);
  assert.equal(code?.status, "expired");
});
