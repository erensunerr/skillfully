import { NextRequest } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { requireSkillEditContext } from "@/lib/skills/authoring-access";
import { getDraftVersion, listPublishingTargets, listSkillFiles } from "@/lib/skills/repository";
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
  let access;
  try {
    access = await requireSkillEditContext({ userId: user.id, email: user.email, skillId });
  } catch {
    return jsonResponse({ error: "skill not found" }, 404, "GET, PATCH, OPTIONS");
  }
  const skill = access.skill;
  const version = await getDraftVersion({ store: access.store, ownerId: access.ownerId, skillId });
  const files = version ? await listSkillFiles({ store: access.store, ownerId: access.ownerId, skillId, versionId: version.id }) : [];
  const targets = await listPublishingTargets({ store: access.store, ownerId: access.ownerId, skillId });

  return jsonResponse({ skill, version, files, targets }, 200, "GET, PATCH, OPTIONS");
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "GET, PATCH, OPTIONS");
  }

  const { skillId } = await params;
  let access;
  try {
    access = await requireSkillEditContext({ userId: user.id, email: user.email, skillId });
  } catch {
    return jsonResponse({ error: "skill not found" }, 404, "GET, PATCH, OPTIONS");
  }
  const skill = access.skill;

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

  await access.store.transact([access.store.update("skills", skill.id, updates)]);
  return jsonResponse({ skill: { ...skill, ...updates } }, 200, "GET, PATCH, OPTIONS");
}
