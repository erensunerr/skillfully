import { NextRequest } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { jsonResponse } from "@/lib/route-helpers";
import { defaultSkillStore, listPublishingTargets } from "@/lib/skills/repository";

type RouteContext = { params: Promise<{ skillId: string; targetKind: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "PATCH, OPTIONS");
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "PATCH, OPTIONS");
  }
  const { skillId, targetKind } = await params;
  const targets = await listPublishingTargets({ ownerId: user.id, skillId });
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

  const updates = {
    ...(body.status !== undefined ? { status: String(body.status) } : {}),
    ...(body.repo_full_name !== undefined ? { repoFullName: String(body.repo_full_name) } : {}),
    ...(body.installation_id !== undefined ? { installationId: String(body.installation_id) } : {}),
    ...(body.skill_root !== undefined ? { skillRoot: String(body.skill_root) } : {}),
    ...(body.base_branch !== undefined ? { baseBranch: String(body.base_branch) } : {}),
    ...(body.auto_merge !== undefined ? { autoMerge: Boolean(body.auto_merge) } : {}),
    ...(body.consent_status !== undefined ? { consentStatus: String(body.consent_status) } : {}),
    updatedAt: Date.now(),
  };

  await defaultSkillStore.transact([defaultSkillStore.update("publishingTargets", target.id, updates)]);
  return jsonResponse({ target: { ...target, ...updates } }, 200, "PATCH, OPTIONS");
}
