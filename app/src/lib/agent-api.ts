import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { getAdminDb } from "@/lib/adminDb";

type FeedbackRows = Array<Record<string, unknown>>;

const LOGIN_CODE_TTL_MS = 10 * 60_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LOGIN_RATE_LIMIT_WINDOW_MS = 60_000;
const LOGIN_REQUESTS_PER_MINUTE = 30;
const LOGIN_CONFIRM_REQUESTS_PER_MINUTE = 30;
const LOGIN_CODE_COOLDOWN_MS = 60_000;
const FEEDBACK_MIN_LIMIT = 1;
const FEEDBACK_MAX_LIMIT = 100;
const FEEDBACK_DEFAULT_LIMIT = 20;
const SKILL_ID_SUFFIX_LENGTH = 10;
const ALLOWED_SKILL_SORT: Record<string, "asc" | "desc"> = {
  asc: "asc",
  desc: "desc",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SKILL_ID_CHARS = "abcdefghijkmnopqrstuvwxyz23456789";
const PUBLIC_TEMPLATE_PATHS = [
  path.join("app", "public", "feedback-template.md"),
  path.join("public", "feedback-template.md"),
];

type LoginRateLimitAction = "login_request" | "login_confirm";
type LoginAttemptOutcome = "success" | "failure";

export type ApiRating = "positive" | "negative" | "neutral";
export type ApiSort = "asc" | "desc";
export type AgentEntity =
  | "apiUsers"
  | "apiLoginCodes"
  | "apiTokens"
  | "apiLoginAttempts"
  | "skills"
  | "feedback";

export type QueryWhere = Record<string, unknown>;

export type QueryInput = {
  [K in AgentEntity]?: {
    $?: {
      where?: QueryWhere;
    };
  };
};

export type QueryResult = {
  [K in AgentEntity]?: FeedbackRows;
};

export interface AgentDataStore {
  query(query: QueryInput): Promise<QueryResult>;
  create(entity: AgentEntity, id: string, values: Record<string, unknown>): unknown;
  update(entity: AgentEntity, id: string, values: Record<string, unknown>): unknown;
  delete(entity: AgentEntity, id: string): unknown;
  transact(ops: unknown[]): Promise<void>;
}

export type SendLoginCode = (args: {
  email: string;
  code: string;
}) => Promise<void> | void;

export type TemplateReader = () => Promise<string>;

export interface ApiDependencies {
  now: () => number;
  idGenerator: () => string;
  codeGenerator: () => string;
  tokenGenerator: () => string;
  db: AgentDataStore;
  sendLoginCode: SendLoginCode;
  readTemplate: TemplateReader;
}

export interface LoginRequestResult {
  userId: string;
  email: string;
  codeExpiresAt: number;
  message: string;
}

export interface LoginConfirmResult {
  token: string;
  tokenPrefix: string;
  tokenType: "Bearer";
  userId: string;
  tokenExpiresAt: number;
}

export interface CreateSkillResult {
  id: string;
  skillId: string;
  name: string;
  description?: string;
  feedbackUrl: string;
  snippet: string;
  createdAt: number;
}

export interface FeedbackListResult {
  items: Array<{
    id: string;
    rating: ApiRating;
    feedback: string;
    createdAt: number;
  }>;
  sort: ApiSort;
  limit: number;
  rating?: ApiRating;
  cursor?: string;
  hasMore: boolean;
  nextCursor?: string;
}

const ALLOWED_RATINGS = new Set<ApiRating>(["positive", "negative", "neutral"]);

class ApiError extends Error {
  public status: number;
  public payload: Record<string, string>;

  constructor(status: number, error: string) {
    super(error);
    this.status = status;
    this.payload = { error };
  }
}

type TxWriter = {
  create: (values: Record<string, unknown>) => unknown;
  update: (values: Record<string, unknown>) => unknown;
  delete: () => unknown;
};

function makeAdminStore(): AgentDataStore {
  const db = getAdminDb();
  const tx = db.tx as unknown as Record<string, Record<string, TxWriter>>;

  return {
    query: async (query: QueryInput) => db.query(query as never),
    create(entity: AgentEntity, id: string, values: Record<string, unknown>) {
      return tx[entity][id].create(values);
    },
    update(entity: AgentEntity, id: string, values: Record<string, unknown>) {
      return tx[entity][id].update(values);
    },
    delete(entity: AgentEntity, id: string) {
      return tx[entity][id].delete();
    },
    async transact(ops: unknown[]) {
      await db.transact(ops as never);
    },
  };
}

function buildDefaultDependencies(): ApiDependencies {
  return {
    now: () => Date.now(),
    idGenerator: () => crypto.randomUUID(),
    codeGenerator: () => {
      return Array.from({ length: 6 }, () => String(crypto.randomInt(0, 10))).join("");
    },
    tokenGenerator: () => crypto.randomBytes(32).toString("hex"),
    db: makeAdminStore(),
    sendLoginCode: async ({ email, code }) => {
      const webhook = process.env.SKILLFULLY_LOGIN_CODE_WEBHOOK;

      if (!webhook) {
        throw new Error("Email delivery unavailable. Set SKILLFULLY_LOGIN_CODE_WEBHOOK.");
      }

      const response = await fetch(webhook, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      if (!response.ok) {
        throw new Error(`Unable to send login code. Webhook status ${response.status}`);
      }
    },
    readTemplate: async () => {
      for (const templatePath of PUBLIC_TEMPLATE_PATHS) {
        const absolutePath = path.join(process.cwd(), templatePath);
        try {
          return await fs.readFile(absolutePath, "utf8");
        } catch {
          // try next candidate
        }
      }
      try {
        return await fs.readFile(path.join(process.cwd(), "app", "public", "feedback-template.md"), "utf8");
      } catch {
        throw new Error("Unable to load feedback template from public/feedback-template.md");
      }
    },
  };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function verifyDigestEquals(a: string, b: string) {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) {
    return err;
  }

  if (err instanceof Error) {
    return new ApiError(500, err.message);
  }

  return new ApiError(500, "unknown server error");
}

function isValidEmail(email: string) {
  return EMAIL_RE.test(email);
}

function randomSkillId() {
  let out = "sk_";
  for (let index = 0; index < SKILL_ID_SUFFIX_LENGTH; index += 1) {
    out += SKILL_ID_CHARS[crypto.randomInt(0, SKILL_ID_CHARS.length)];
  }
  return out;
}

function pickFirst<T>(items: Array<T> | undefined): T | null {
  return items?.[0] ?? null;
}

function hasExpired(expiresAt: unknown, now: number) {
  return typeof expiresAt !== "number" || expiresAt <= now;
}

function queryByWhere<T extends Record<string, unknown>>(
  rows: Record<string, unknown>[] | undefined,
  where?: QueryWhere,
) {
  if (!rows || !where) {
    return (rows ?? []) as T[];
  }

  const keys = Object.keys(where);
  return rows.filter((row) =>
    keys.every(
      (field) =>
        Object.prototype.hasOwnProperty.call(row, field) &&
        row[field] === where[field],
    ),
  ) as T[];
}

function rateLimitConfig(action: LoginRateLimitAction) {
  if (action === "login_request") {
    return {
      maxAttempts: LOGIN_REQUESTS_PER_MINUTE,
      windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
    };
  }
  return {
    maxAttempts: LOGIN_CONFIRM_REQUESTS_PER_MINUTE,
    windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
  };
}

function rateLimitCursorFilter(
  rows: Record<string, unknown>[] | undefined,
  now: number,
  windowMs: number,
) {
  return queryByWhere(rows, undefined).filter((row) => {
    const createdAt = Number(row.createdAt);
    return Number.isFinite(createdAt) && createdAt > now - windowMs;
  });
}

async function enforceLoginRateLimit(
  config: ApiDependencies,
  params: {
    ipHash: string;
    action: LoginRateLimitAction;
    email: string;
    now: number;
  },
) {
  if (!params.ipHash) {
    return;
  }

  const limits = rateLimitConfig(params.action);
  const { apiLoginAttempts } = await config.db.query({
    apiLoginAttempts: {
      $: {
        where: {
          action: params.action,
          ipHash: params.ipHash,
          email: params.email,
        },
      },
    },
  });
  const recentAttempts = rateLimitCursorFilter(
    apiLoginAttempts,
    params.now,
    limits.windowMs,
  );
  if (recentAttempts.length >= limits.maxAttempts) {
    throw new ApiError(429, "rate limit exceeded. Try again shortly.");
  }
}

async function recordLoginAttempt(
  config: ApiDependencies,
  params: {
    ipHash: string;
    action: LoginRateLimitAction;
    outcome: LoginAttemptOutcome;
    email: string;
    now: number;
  },
) {
  if (!params.ipHash) {
    return;
  }

  await config.db.create("apiLoginAttempts", config.idGenerator(), {
    action: params.action,
    outcome: params.outcome,
    email: params.email,
    ipHash: params.ipHash,
    createdAt: params.now,
  });
}

function parseFeedbackSort(value: string | null) {
  if (!value) {
    return "desc" as const;
  }
  const normalized = value.toLowerCase();
  if (normalized !== "asc" && normalized !== "desc") {
    throw new ApiError(400, "invalid sort value. Use asc or desc");
  }
  return ALLOWED_SKILL_SORT[normalized];
}

function parseFeedbackLimit(value: string | null) {
  if (!value) {
    return FEEDBACK_DEFAULT_LIMIT;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < FEEDBACK_MIN_LIMIT || parsed > FEEDBACK_MAX_LIMIT) {
    throw new ApiError(
      400,
      `invalid limit. Use a number between ${FEEDBACK_MIN_LIMIT} and ${FEEDBACK_MAX_LIMIT}`,
    );
  }

  return parsed;
}

function parseFeedbackCursor(value: string | null): FeedbackCursor | undefined {
  if (!value) {
    return undefined;
  }
  const separator = value.lastIndexOf(":");
  if (separator <= 0) {
    throw new ApiError(400, "invalid cursor");
  }
  const createdAt = Number.parseInt(value.slice(0, separator), 10);
  const id = value.slice(separator + 1);
  if (!Number.isFinite(createdAt) || !id) {
    throw new ApiError(400, "invalid cursor");
  }
  return { createdAt, id };
}

function parseRating(value: string | null) {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!ALLOWED_RATINGS.has(normalized as ApiRating)) {
    throw new ApiError(
      400,
      "invalid rating filter. Use positive, negative, or neutral",
    );
  }
  return normalized as ApiRating;
}

function getBearerToken(header: string | null) {
  if (!header) {
    return null;
  }
  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function buildFeedbackSnippet(template: string, baseUrl: string, skillId: string) {
  return template.replaceAll("{{feedbackUrl}}", `${baseUrl}/feedback/${skillId}`);
}

type FeedbackCursor = { createdAt: number; id: string };

export async function requestLoginCode(
  params: { email: string; ipHash?: string },
  deps: Partial<ApiDependencies> = {},
): Promise<LoginRequestResult> {
  const normalized = normalizeEmail(String(params.email ?? ""));
  const config = { ...buildDefaultDependencies(), ...deps };
  const ipHash = params.ipHash ? params.ipHash.trim() : "";

  if (!normalized || !isValidEmail(normalized)) {
    throw new ApiError(400, "invalid email");
  }

  try {
    const now = config.now();
    if (ipHash) {
      await enforceLoginRateLimit(config, {
        action: "login_request",
        email: normalized,
        ipHash,
        now,
      });
    }

    const users = await config.db.query({
      apiUsers: { $: { where: { email: normalized } } },
    });
    const existingUser = pickFirst(users.apiUsers);
    if (typeof existingUser?.lastLoginCodeSentAt === "number") {
      const nextAttemptAt = existingUser.lastLoginCodeSentAt + LOGIN_CODE_COOLDOWN_MS;
      if (nextAttemptAt > now) {
        throw new ApiError(
          429,
          `Please wait ${Math.max(1, Math.ceil((nextAttemptAt - now) / 1000))} seconds before requesting another code`,
        );
      }
    }

    const userId = (existingUser?.id as string | undefined) ?? config.idGenerator();

    const existingCodes = await config.db.query({
      apiLoginCodes: { $: { where: { userId } } },
    });

    const codeId = config.idGenerator();
    const code = config.codeGenerator();
    const hashedCode = hashValue(code);

    const ops = [
      ...(existingUser ? [config.db.update("apiUsers", userId, { lastLoginCodeSentAt: now })] : [
        config.db.create("apiUsers", userId, {
          email: normalized,
          createdAt: now,
          lastLoginCodeSentAt: now,
        }),
      ]),
      ...queryByWhere(existingCodes.apiLoginCodes, undefined).map((entry) =>
        config.db.delete("apiLoginCodes", entry.id as string),
      ),
      config.db.create("apiLoginCodes", codeId, {
        userId,
        email: normalized,
        codeHash: hashedCode,
        createdAt: now,
        expiresAt: now + LOGIN_CODE_TTL_MS,
      }),
    ];

    await config.db.transact(ops);
    await config.sendLoginCode({ email: normalized, code });
    await recordLoginAttempt(config, {
      action: "login_request",
      email: normalized,
      outcome: "success",
      ipHash,
      now,
    });

    return {
      userId,
      email: normalized,
      codeExpiresAt: now + LOGIN_CODE_TTL_MS,
      message: "code sent",
    };
  } catch (error) {
    throw toApiError(error);
  }
}

export async function confirmLoginCode(
  params: { email: string; code: string; ipHash?: string },
  deps: Partial<ApiDependencies> = {},
): Promise<LoginConfirmResult> {
  const normalized = normalizeEmail(String(params.email ?? ""));
  const config = { ...buildDefaultDependencies(), ...deps };
  const code = String(params.code ?? "").trim();
  const ipHash = params.ipHash ? params.ipHash.trim() : "";

  if (!normalized || !isValidEmail(normalized) || code.length === 0) {
    throw new ApiError(400, "invalid email or code");
  }

  try {
    const now = config.now();
    if (ipHash) {
      await enforceLoginRateLimit(config, {
        action: "login_confirm",
        email: normalized,
        ipHash,
        now,
      });
    }

    const users = await config.db.query({
      apiUsers: { $: { where: { email: normalized } } },
    });
    const user = pickFirst(users.apiUsers);
    if (!user?.id) {
      await recordLoginAttempt(config, {
        action: "login_confirm",
        email: normalized,
        outcome: "failure",
        ipHash,
        now,
      });
      throw new ApiError(401, "invalid code");
    }

    const userId = user.id as string;
    const providedCodeHash = hashValue(code);
    const codes = await config.db.query({
      apiLoginCodes: { $: { where: { userId } } },
    });

    const matchedCode = queryByWhere(codes.apiLoginCodes, undefined)
      .filter((entry) => {
        const hash = entry.codeHash as string;
        const consumedAt = entry.consumedAt as number | undefined;
        const expiresAt = entry.expiresAt as number | undefined;
        return (
          typeof hash === "string" &&
          !consumedAt &&
          !hasExpired(expiresAt, now) &&
          verifyDigestEquals(hash, providedCodeHash)
        );
      })
      .sort((a, b) => {
        const aCreated = Number(a.createdAt);
        const bCreated = Number(b.createdAt);
        return bCreated - aCreated;
      })[0];

    if (!matchedCode?.id) {
      await recordLoginAttempt(config, {
        action: "login_confirm",
        email: normalized,
        outcome: "failure",
        ipHash,
        now,
      });
      throw new ApiError(401, "invalid code");
    }

    const token = config.tokenGenerator();
    const tokenRecordId = config.idGenerator();
    const tokenPrefix = token.slice(0, 8);
    const tokenHash = hashValue(token);

    const existingTokens = await config.db.query({
      apiTokens: { $: { where: { userId } } },
    });

    const ops = [
      config.db.update("apiLoginCodes", matchedCode.id as string, { consumedAt: now }),
      config.db.create("apiTokens", tokenRecordId, {
        userId,
        tokenHash,
        tokenPrefix,
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS,
      }),
      ...queryByWhere(existingTokens.apiTokens, undefined)
        .filter((entry) => entry.id !== tokenRecordId)
        .map((entry) => config.db.delete("apiTokens", entry.id as string)),
    ];

    await config.db.transact(ops);
    await recordLoginAttempt(config, {
      action: "login_confirm",
      email: normalized,
      outcome: "success",
      ipHash,
      now,
    });

    return {
      token,
      tokenPrefix,
      tokenType: "Bearer",
      userId,
      tokenExpiresAt: now + SESSION_TTL_MS,
    };
  } catch (error) {
    throw toApiError(error);
  }
}

export async function resolveTokenOwner(
  token: string,
  deps: Partial<ApiDependencies> = {},
) {
  const config = { ...buildDefaultDependencies(), ...deps };

  if (!token) {
    throw new ApiError(401, "missing Authorization bearer token");
  }

  const tokenHash = hashValue(token);
  const tokens = await config.db.query({
    apiTokens: {
      $: {
        where: { tokenHash },
      },
    },
  });

  const now = config.now();
  const record = queryByWhere(tokens.apiTokens, undefined)
    .filter((entry) => !hasExpired(entry.expiresAt, now))
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];

  if (!record?.userId || typeof record.userId !== "string") {
    throw new ApiError(401, "invalid or expired token");
  }

  return { userId: record.userId };
}

export async function createTrackedSkill(
  params: { token: string; name: string; description?: string; baseUrl: string },
  deps: Partial<ApiDependencies> = {},
): Promise<CreateSkillResult> {
  const config = { ...buildDefaultDependencies(), ...deps };
  const name = String(params.name ?? "").trim();
  const description = params.description ? String(params.description).trim() : undefined;

  if (!name) {
    throw new ApiError(400, "missing required field: name");
  }

  if (name.length > 140) {
    throw new ApiError(400, "name exceeds 140 characters");
  }

  if (description && description.length > 2_000) {
    throw new ApiError(400, "description exceeds 2000 characters");
  }

  const baseUrl = String(params.baseUrl ?? "").trim() || "https://www.skillfully.sh";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.replace(/\/+$/, "") : baseUrl;

  try {
    const { userId } = await resolveTokenOwner(params.token, config);
    const now = config.now();
    const id = config.idGenerator();
    const skillId = randomSkillId();

    await config.db.transact([
      config.db.create("skills", id, {
        ownerId: userId,
        name,
        description,
        skillId,
        createdAt: now,
      }),
    ]);

    const template = await config.readTemplate();
    const snippet = buildFeedbackSnippet(template, normalizedBaseUrl, skillId);

    return {
      id,
      skillId,
      name,
      description,
      feedbackUrl: `${normalizedBaseUrl}/feedback/${skillId}`,
      snippet,
      createdAt: now,
    };
  } catch (error) {
    throw toApiError(error);
  }
}

export async function listFeedbackForSkill(
  params: {
    token: string;
    skillId: string;
    rating?: string | null;
    sort?: string | null;
    limit?: string | null;
    cursor?: string | null;
  },
  deps: Partial<ApiDependencies> = {},
): Promise<FeedbackListResult> {
  const config = { ...buildDefaultDependencies(), ...deps };
  const skillId = String(params.skillId ?? "").trim();
  const rating = parseRating(params.rating ? String(params.rating) : null);
  const sort = parseFeedbackSort(params.sort ? String(params.sort) : null);
  const limit = parseFeedbackLimit(params.limit ? String(params.limit) : null);
  const cursor = parseFeedbackCursor(params.cursor ? String(params.cursor) : null);

  if (!skillId) {
    throw new ApiError(400, "missing required field: skillId");
  }

  try {
    const { userId } = await resolveTokenOwner(params.token, config);
    const skills = await config.db.query({
      skills: {
        $: {
          where: {
            skillId,
          },
        },
      },
    });
    const skill = pickFirst(skills.skills);
    if (!skill || skill.ownerId !== userId) {
      throw new ApiError(404, "skill not found");
    }

    const query: QueryInput = {
      feedback: {
        $: {
          where: {
            ownerId: userId,
            skillId,
            ...(rating ? { rating } : {}),
          },
        },
      },
    };

    const { feedback } = await config.db.query(query);
    const allEntries = queryByWhere(feedback, undefined)
      .filter((entry) => typeof entry.createdAt === "number")
      .map((entry) => ({
        id: entry.id as string,
        rating: entry.rating as ApiRating,
        feedback: entry.feedback as string,
        createdAt: entry.createdAt as number,
      }));

    const sorted = allEntries.sort((a, b) =>
      sort === "asc"
        ? a.createdAt - b.createdAt || a.id.localeCompare(b.id)
        : b.createdAt - a.createdAt || b.id.localeCompare(a.id),
    );

    const cursorToken = cursor === undefined ? undefined : `${cursor.createdAt}:${cursor.id}`;
    const filtered = cursor === undefined
      ? sorted
      : sorted.filter((entry) => {
          return sort === "asc"
            ? entry.createdAt > cursor.createdAt ||
            (entry.createdAt === cursor.createdAt && entry.id.localeCompare(cursor.id) > 0)
            : entry.createdAt < cursor.createdAt ||
            (entry.createdAt === cursor.createdAt && entry.id.localeCompare(cursor.id) < 0);
        });

    const window = filtered.slice(0, limit);
    const nextCursor = (() => {
      if (filtered.length <= limit) {
        return undefined;
      }

      const lastItem = window.at(-1);
      if (!lastItem) {
        return undefined;
      }

      return `${lastItem.createdAt}:${lastItem.id}`;
    })();

    return {
      items: window,
      sort,
      limit,
      rating,
      cursor: cursorToken,
      hasMore: filtered.length > limit,
      nextCursor,
    };
  } catch (error) {
    throw toApiError(error);
  }
}

export { ApiError, getBearerToken };
