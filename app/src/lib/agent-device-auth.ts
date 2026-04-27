import crypto from "node:crypto";

import { getAdminDb } from "@/lib/adminDb";
import { ApiError } from "@/lib/agent-api";

const DEVICE_CODE_TTL_MS = 15 * 60_000;
const AUTHOR_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const POLL_INTERVAL_SECONDS = 5;
const USER_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type DeviceEntity = "agentDeviceCodes" | "apiTokens";
type Row = Record<string, unknown>;
type QueryInput = {
  [K in DeviceEntity]?: {
    $?: {
      where?: Record<string, unknown>;
    };
  };
};

export type AgentDeviceAuthStore = {
  query(query: QueryInput): Promise<Record<string, Row[]>>;
  create(entity: DeviceEntity, id: string, values: Row): unknown;
  update(entity: DeviceEntity, id: string, values: Row): unknown;
  transact(ops: unknown[]): Promise<void>;
};

type TxWriter = {
  create: (values: Row) => unknown;
  update: (values: Row) => unknown;
};

export type AgentDeviceAuthDependencies = {
  store: AgentDeviceAuthStore;
  now: () => number;
  idGenerator: () => string;
  deviceCodeGenerator: () => string;
  userCodeGenerator: () => string;
  tokenGenerator: () => string;
};

function makeAdminStore(): AgentDeviceAuthStore {
  const db = getAdminDb();
  const tx = db.tx as unknown as Record<DeviceEntity, Record<string, TxWriter>>;

  return {
    query: async (query) => db.query(query as never) as Promise<Record<string, Row[]>>,
    create(entity, id, values) {
      return tx[entity][id].create(values);
    },
    update(entity, id, values) {
      return tx[entity][id].update(values);
    },
    async transact(ops) {
      await db.transact(ops as never);
    },
  };
}

function randomUserCode() {
  const raw = Array.from({ length: 8 }, () => USER_CODE_CHARS[crypto.randomInt(0, USER_CODE_CHARS.length)]).join("");
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function tokenPrefix(token: string) {
  return hashValue(token).slice(0, 8);
}

function normalizeUserCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized.length === 8 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : value.trim().toUpperCase();
}

function buildDefaultDependencies(): AgentDeviceAuthDependencies {
  return {
    store: makeAdminStore(),
    now: () => Date.now(),
    idGenerator: () => crypto.randomUUID(),
    deviceCodeGenerator: () => crypto.randomBytes(32).toString("base64url"),
    userCodeGenerator: randomUserCode,
    tokenGenerator: () => crypto.randomBytes(32).toString("hex"),
  };
}

function firstRow<T extends Row>(rows: T[] | undefined) {
  return rows?.[0] ? (rows[0] as T & { id: string }) : null;
}

export async function createAgentDeviceAuthorization(
  {
    agentName,
    baseUrl,
  }: {
    agentName?: string | null;
    baseUrl: string;
  },
  deps: Partial<AgentDeviceAuthDependencies> = {},
) {
  const config = { ...buildDefaultDependencies(), ...deps };
  const now = config.now();
  const id = config.idGenerator();
  const deviceCode = config.deviceCodeGenerator();
  const userCode = normalizeUserCode(config.userCodeGenerator());
  const cleanAgentName = agentName?.trim().slice(0, 120) || "Author agent";
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  await config.store.transact([
    config.store.create("agentDeviceCodes", id, {
      deviceCodeHash: hashValue(deviceCode),
      userCodeHash: hashValue(userCode),
      userCodeDisplay: userCode,
      agentName: cleanAgentName,
      status: "pending",
      scope: "skills:write",
      expiresAt: now + DEVICE_CODE_TTL_MS,
      createdAt: now,
      updatedAt: now,
    }),
  ]);

  return {
    deviceCode,
    userCode,
    verificationUri: `${normalizedBaseUrl}/agent-auth`,
    verificationUriComplete: `${normalizedBaseUrl}/agent-auth?code=${encodeURIComponent(userCode)}`,
    expiresIn: Math.floor(DEVICE_CODE_TTL_MS / 1000),
    interval: POLL_INTERVAL_SECONDS,
  };
}

export async function approveAgentDeviceAuthorization(
  {
    userCode,
    ownerId,
  }: {
    userCode: string;
    ownerId: string;
  },
  deps: Partial<AgentDeviceAuthDependencies> = {},
) {
  const config = { ...buildDefaultDependencies(), ...deps };
  const normalizedCode = normalizeUserCode(userCode);
  const rows = await config.store.query({
    agentDeviceCodes: {
      $: {
        where: {
          userCodeHash: hashValue(normalizedCode),
        },
      },
    },
  });
  const record = firstRow(rows.agentDeviceCodes);
  const now = config.now();

  if (!record) {
    throw new ApiError(404, "device code not found");
  }

  if (Number(record.expiresAt) < now) {
    await config.store.transact([
      config.store.update("agentDeviceCodes", record.id, {
        status: "expired",
        updatedAt: now,
      }),
    ]);
    throw new ApiError(410, "device code expired");
  }

  if (record.status !== "pending") {
    throw new ApiError(409, `device code is ${String(record.status)}`);
  }

  const updates = {
    ownerId,
    status: "approved",
    approvedAt: now,
    updatedAt: now,
  };
  await config.store.transact([config.store.update("agentDeviceCodes", record.id, updates)]);

  return {
    userCode: String(record.userCodeDisplay),
    agentName: typeof record.agentName === "string" ? record.agentName : "Author agent",
    scope: String(record.scope || "skills:write"),
    status: "approved",
    expiresAt: Number(record.expiresAt),
  };
}

export async function exchangeAgentDeviceCode(
  {
    deviceCode,
  }: {
    deviceCode: string;
  },
  deps: Partial<AgentDeviceAuthDependencies> = {},
) {
  const config = { ...buildDefaultDependencies(), ...deps };
  const rows = await config.store.query({
    agentDeviceCodes: {
      $: {
        where: {
          deviceCodeHash: hashValue(deviceCode),
        },
      },
    },
  });
  const record = firstRow(rows.agentDeviceCodes);
  const now = config.now();

  if (!record) {
    throw new ApiError(400, "invalid device_code");
  }

  if (Number(record.expiresAt) < now) {
    await config.store.transact([
      config.store.update("agentDeviceCodes", record.id, {
        status: "expired",
        updatedAt: now,
      }),
    ]);
    throw new ApiError(400, "expired_token");
  }

  if (record.status === "pending") {
    throw new ApiError(428, "authorization_pending");
  }

  if (record.status === "denied") {
    throw new ApiError(403, "access_denied");
  }

  if (record.status === "consumed") {
    throw new ApiError(400, "device_code_already_consumed");
  }

  if (record.status !== "approved" || typeof record.ownerId !== "string") {
    throw new ApiError(400, `device code is ${String(record.status)}`);
  }

  const token = config.tokenGenerator();
  const tokenRecordId = config.idGenerator();
  const tokenExpiresAt = now + AUTHOR_TOKEN_TTL_MS;

  await config.store.transact([
    config.store.create("apiTokens", tokenRecordId, {
      userId: record.ownerId,
      tokenHash: hashValue(token),
      tokenPrefix: tokenPrefix(token),
      expiresAt: tokenExpiresAt,
      createdAt: now,
    }),
    config.store.update("agentDeviceCodes", record.id, {
      status: "consumed",
      consumedAt: now,
      updatedAt: now,
    }),
  ]);

  return {
    token,
    tokenType: "Bearer" as const,
    tokenPrefix: tokenPrefix(token),
    ownerId: record.ownerId,
    scope: String(record.scope || "skills:write"),
    tokenExpiresAt,
  };
}

export const agentDeviceAuthInternals = {
  hashValue,
  normalizeUserCode,
};
