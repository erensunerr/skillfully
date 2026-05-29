import { NextRequest } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { jsonResponse } from "@/lib/route-helpers";
import { requireSkillEditContext } from "@/lib/skills/authoring-access";
import {
  assertAuthorizedGitHubPublishingTarget,
  listPublishingTargets,
} from "@/lib/skills/repository";

type RouteContext = { params: Promise<{ skillId: string; targetKind: string }> };
const CONSENT_STATUSES = new Set(["pending", "granted", "revoked"]);

export async function OPTIONS() {
  return jsonResponse({}, 200, "PATCH, OPTIONS");
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "PATCH, OPTIONS");
  }
  const { skillId, targetKind } = await params;
  let access;
  try {
    access = await requireSkillEditContext({ userId: user.id, email: user.email, skillId });
  } catch {
    return jsonResponse({ error: "skill not found" }, 404, "PATCH, OPTIONS");
  }
  const targets = await listPublishingTargets({ store: access.store, ownerId: access.ownerId, skillId });
  const target = targets.find((entry) => entry.targetKind === targetKind);
  if (!target) {
    return jsonResponse({ error: "target not found" }, 404, "PATCH, OPTIONS");
  }

  let body: {
    status?: unknown;
    repo_full_name?: unknown;
    installation_id?: unknown;
    skill_root?: unknown;
    base_branch?: unknown;
    auto_merge?: unknown;
    consent_status?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400, "PATCH, OPTIONS");
  }

  const requestedConsentStatus = body.consent_status !== undefined
    ? String(body.consent_status).trim()
    : target.consentStatus;
  if (requestedConsentStatus !== undefined && !CONSENT_STATUSES.has(requestedConsentStatus)) {
    return jsonResponse({ error: "invalid consent_status" }, 400, "PATCH, OPTIONS");
  }

  let authorizedGitHubTarget: Awaited<ReturnType<typeof assertAuthorizedGitHubPublishingTarget>> | null = null;
  const requestedRepoFullName = body.repo_full_name !== undefined
    ? String(body.repo_full_name).trim()
    : target.repoFullName ?? "";
  const requestedInstallationId = body.installation_id !== undefined
    ? String(body.installation_id).trim()
    : target.installationId ?? "";
  if (
    targetKind === "github" &&
    (
      body.repo_full_name !== undefined ||
      body.installation_id !== undefined ||
      requestedConsentStatus === "granted"
    )
  ) {
    if (!requestedRepoFullName || !requestedInstallationId) {
      return jsonResponse(
        { error: "GitHub repository and installation are required" },
        400,
        "PATCH, OPTIONS",
      );
    }
    try {
      authorizedGitHubTarget = await assertAuthorizedGitHubPublishingTarget({
        store: access.store,
        ownerId: access.ownerId,
        installationId: requestedInstallationId,
        repoFullName: requestedRepoFullName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub publish target is not authorized";
      return jsonResponse(
        { error: message },
        message.startsWith("invalid ") ? 400 : 403,
        "PATCH, OPTIONS",
      );
    }
  }

  const updates = {
    ...(body.status !== undefined ? { status: String(body.status) } : {}),
    ...(body.repo_full_name !== undefined
      ? { repoFullName: authorizedGitHubTarget?.repoFullName ?? requestedRepoFullName }
      : {}),
    ...(body.installation_id !== undefined
      ? { installationId: authorizedGitHubTarget?.installationId ?? requestedInstallationId }
      : {}),
    ...(authorizedGitHubTarget?.repositoryId ? { repositoryId: authorizedGitHubTarget.repositoryId } : {}),
    ...(body.skill_root !== undefined ? { skillRoot: String(body.skill_root) } : {}),
    ...(body.base_branch !== undefined ? { baseBranch: String(body.base_branch) } : {}),
    ...(body.auto_merge !== undefined ? { autoMerge: Boolean(body.auto_merge) } : {}),
    ...(body.consent_status !== undefined ? { consentStatus: requestedConsentStatus } : {}),
    updatedAt: Date.now(),
  };

  await access.store.transact([access.store.update("publishingTargets", target.id, updates)]);
  return jsonResponse({ target: { ...target, ...updates } }, 200, "PATCH, OPTIONS");
}
