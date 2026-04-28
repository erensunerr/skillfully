import { NextRequest } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { defaultSkillStore, getDraftVersion, getSkillForOwner, listPublishingTargets, listSkillFiles } from "@/lib/skills/repository";
import { jsonResponse } from "@/lib/route-helpers";

type RouteContext = { params: Promise<{ skillId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "GET, PATCH, OPTIONS");
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const request = _request;
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "GET, PATCH, OPTIONS");
  }

  const { skillId } = await params;
  const skill = await getSkillForOwner({ ownerId: user.id, skillId });
  if (!skill) {
    return jsonResponse({ error: "skill not found" }, 404, "GET, PATCH, OPTIONS");
  }
  const version = await getDraftVersion({ ownerId: user.id, skillId });
  const files = version ? await listSkillFiles({ ownerId: user.id, skillId, versionId: version.id }) : [];
  const targets = await listPublishingTargets({ ownerId: user.id, skillId });

  return jsonResponse({ skill, version, files, targets }, 200, "GET, PATCH, OPTIONS");
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "GET, PATCH, OPTIONS");
  }

  const { skillId } = await params;
  const skill = await getSkillForOwner({ ownerId: user.id, skillId });
  if (!skill) {
    return jsonResponse({ error: "skill not found" }, 404, "GET, PATCH, OPTIONS");
  }

  let body: { name?: unknown; description?: unknown; visibility?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400, "GET, PATCH, OPTIONS");
  }

  const updates = {
    ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
    ...(body.description !== undefined ? { description: String(body.description).trim() } : {}),
    ...(body.visibility !== undefined ? { visibility: String(body.visibility).trim() } : {}),
    updatedAt: Date.now(),
  };

  await defaultSkillStore.transact([defaultSkillStore.update("skills", skill.id, updates)]);
  return jsonResponse({ skill: { ...skill, ...updates } }, 200, "GET, PATCH, OPTIONS");
}
