import crypto from "node:crypto";

type GitHubInstallStatePayload = {
  ownerId: string;
  exp: number;
  nonce: string;
};

function stateSecret() {
  return process.env.GITHUB_APP_STATE_SECRET || process.env.GITHUB_APP_WEBHOOK_SECRET || process.env.INSTANT_APP_ADMIN_TOKEN || "";
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest();
}

export function createGitHubInstallState({
  ownerId,
  now = Date.now(),
}: {
  ownerId: string;
  now?: number;
}) {
  const secret = stateSecret();
  if (!secret) {
    throw new Error("GitHub install state secret is not configured");
  }

  const payload = base64Url(JSON.stringify({
    ownerId,
    exp: now + 15 * 60_000,
    nonce: crypto.randomUUID(),
  } satisfies GitHubInstallStatePayload));
  return `${payload}.${base64Url(sign(payload, secret))}`;
}

export function verifyGitHubInstallState({
  state,
  ownerId,
  now = Date.now(),
}: {
  state: string | null;
  ownerId: string;
  now?: number;
}) {
  const secret = stateSecret();
  if (!secret || !state) {
    return false;
  }

  const [payload, signature] = state.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expected = base64Url(sign(payload, secret));
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GitHubInstallStatePayload;
    return decoded.ownerId === ownerId && decoded.exp >= now;
  } catch {
    return false;
  }
}
