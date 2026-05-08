import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/adminDb";
import { getDashboardUser } from "@/lib/dashboard-auth";
import { createGitHubImportSession } from "@/lib/github-import";
import { verifyGitHubInstallState } from "@/lib/github-install-state";
import { getGitHubAppInstallation } from "@/lib/publishing/adapters/github-app";
import { defaultSkillStore } from "@/lib/skills/repository";

function dashboardRedirect(request: NextRequest, status: string, params: Record<string, string> = {}) {
  const url = new URL("/dashboard", request.url);
  url.searchParams.set("github", status);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const installationId = request.nextUrl.searchParams.get("installation_id");
  const state = request.nextUrl.searchParams.get("state");
  const user = await getDashboardUser(request);
  if (!user) {
    return dashboardRedirect(request, "unauthorized");
  }
  if (!installationId) {
    return dashboardRedirect(request, "missing_installation");
  }
  if (!verifyGitHubInstallState({ state, ownerId: user.id })) {
    return dashboardRedirect(request, "invalid_state");
  }
  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
    return dashboardRedirect(request, "not_configured");
  }

  try {
    const installation = await getGitHubAppInstallation({
      fetcher: fetch,
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
      installationId,
    });
    const accountLogin = String(installation.account?.login || "unknown");
    const accountType = String(installation.account?.type || "User");
    const now = Date.now();
    const rows = await adminDb.query({
      githubInstallations: {
        $: {
          where: {
            installationId,
          },
        },
      },
    } as never) as { githubInstallations?: Array<Record<string, unknown>> };
    const existing = rows.githubInstallations?.[0];
    if (existing?.ownerId && existing.ownerId !== user.id) {
      return dashboardRedirect(request, "owner_conflict");
    }

    const tx = adminDb.tx as unknown as Record<string, Record<string, {
      create: (values: Record<string, unknown>) => unknown;
      update: (values: Record<string, unknown>) => unknown;
    }>>;
    const id = existing?.id ? String(existing.id) : crypto.randomUUID();
    await adminDb.transact([
      existing
        ? tx.githubInstallations[id].update({
            ownerId: user.id,
            accountId: installation.account?.id ? String(installation.account.id) : existing.accountId,
            accountLogin: accountLogin || String(existing.accountLogin || "unknown"),
            accountType: accountType || String(existing.accountType || "User"),
            repositorySelection: String(installation.repository_selection || existing.repositorySelection || "selected"),
            permissionsJson: installation.permissions || existing.permissionsJson || {},
            updatedAt: now,
          })
        : tx.githubInstallations[id].create({
            ownerId: user.id,
            installationId,
            ...(installation.account?.id ? { accountId: String(installation.account.id) } : {}),
            accountLogin,
            accountType,
            repositorySelection: String(installation.repository_selection || "selected"),
            permissionsJson: installation.permissions || {},
            createdAt: now,
            updatedAt: now,
          }),
    ] as never);
    const session = await createGitHubImportSession({
      store: defaultSkillStore,
      ownerId: user.id,
      installationId,
      accountLogin,
      accountType,
    });
    return dashboardRedirect(request, "installed", { github_import: session.sessionId });
  } catch {
    return dashboardRedirect(request, "install_failed");
  }
}
