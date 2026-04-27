import crypto from "node:crypto";
import { NextRequest } from "next/server";

import { adminDb } from "@/lib/adminDb";
import { jsonResponse } from "@/lib/route-helpers";

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  if (!signature?.startsWith("sha256=")) {
    return false;
  }
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function upsertInstallation(payload: Record<string, any>) {
  const installation = payload.installation;
  if (!installation?.id || !installation.account?.login) {
    return;
  }

  const now = Date.now();
  const installationId = String(installation.id);
  const rows = await adminDb.query({
    githubInstallations: {
      $: {
        where: {
          installationId,
        },
      },
    },
  } as never) as { githubInstallations?: Array<{ id: string }> };
  const id = rows.githubInstallations?.[0]?.id || crypto.randomUUID();
  const createValues = {
    installationId,
    accountLogin: String(installation.account.login),
    accountType: String(installation.account.type || "User"),
    repositorySelection: String(installation.repository_selection || ""),
    permissionsJson: installation.permissions || {},
    createdAt: now,
    updatedAt: now,
  };
  const updateValues = {
    installationId,
    accountLogin: createValues.accountLogin,
    accountType: createValues.accountType,
    repositorySelection: createValues.repositorySelection,
    permissionsJson: createValues.permissionsJson,
    updatedAt: now,
  };

  const tx = adminDb.tx as unknown as Record<string, Record<string, {
    create: (values: Record<string, unknown>) => unknown;
    update: (values: Record<string, unknown>) => unknown;
  }>>;
  await adminDb.transact([
    rows.githubInstallations?.[0]
      ? tx.githubInstallations[id].update(updateValues)
      : tx.githubInstallations[id].create(createValues),
  ] as never);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return jsonResponse({ error: "invalid signature" }, 401, "POST, OPTIONS");
  }

  const event = request.headers.get("x-github-event");
  const payload = JSON.parse(rawBody || "{}") as Record<string, any>;
  if (event === "installation" || event === "installation_repositories") {
    await upsertInstallation(payload);
  }

  return jsonResponse({ ok: true }, 200, "POST, OPTIONS");
}
