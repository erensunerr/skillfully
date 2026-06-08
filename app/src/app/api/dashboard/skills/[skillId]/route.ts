import { NextRequest } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { requireSkillEditContext } from "@/lib/skills/authoring-access";
import { deleteSkillDraft, getDraftVersion, listPublishingTargets, listSkillFiles, updateSkillMetadata } from "@/lib/skills/repository";
import { jsonResponse } from "@/lib/route-helpers";

type RouteContext = { params: Promise<{ skillId: string }> };
const ALLOW = "GET, PATCH, DELETE, OPTIONS";

export async function OPTIONS() {
  return jsonResponse({}, 200, ALLOW);
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const request = _request;
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, ALLOW);
  }

  const { skillId } = await params;
  let access;
  try {
    access = await requireSkillEditContext({ userId: user.id, email: user.email, skillId });
  } catch {
    return jsonResponse({ error: "skill not found" }, 404, ALLOW);
  }
  const skill = access.skill;
  const version = await getDraftVersion({ store: access.store, ownerId: access.ownerId, skillId });
  const files = version ? await listSkillFiles({ store: access.store, ownerId: access.ownerId, skillId, versionId: version.id }) : [];
  const targets = await listPublishingTargets({ store: access.store, ownerId: access.ownerId, skillId });

  return jsonResponse({ skill, version, files, targets }, 200, ALLOW);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, ALLOW);
  }

  const { skillId } = await params;
  let access;
  try {
    access = await requireSkillEditContext({ userId: user.id, email: user.email, skillId });
  } catch {
    return jsonResponse({ error: "skill not found" }, 404, ALLOW);
  }

  let body: {
    name?: unknown;
    description?: unknown;
    visibility?: unknown;
    anyoneWithLinkCanUse?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400, ALLOW);
  }

  try {
    const anyoneWithLinkCanUseInput = body.anyoneWithLinkCanUse;
    if (anyoneWithLinkCanUseInput !== undefined && typeof anyoneWithLinkCanUseInput !== "boolean") {
      return jsonResponse({ error: "anyoneWithLinkCanUse must be boolean" }, 400, ALLOW);
    }
    const skill = await updateSkillMetadata({
      store: access.store,
      ownerId: access.ownerId,
      skillId,
      name: body.name === undefined ? undefined : String(body.name),
      description: body.description === undefined ? undefined : String(body.description),
      visibility: body.visibility === undefined ? undefined : String(body.visibility),
      anyoneWithLinkCanUse: anyoneWithLinkCanUseInput,
    });
    return jsonResponse({ skill }, 200, ALLOW);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, 400, ALLOW);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, ALLOW);
  }

  const { skillId } = await params;
  let access;
  try {
    access = await requireSkillEditContext({ userId: user.id, email: user.email, skillId });
  } catch {
    return jsonResponse({ error: "skill not found" }, 404, ALLOW);
  }
  if (access.ownerId !== user.id) {
    return jsonResponse({ error: "only the owner can delete a skill" }, 403, ALLOW);
  }

  try {
    const skill = await deleteSkillDraft({ store: access.store, ownerId: access.ownerId, skillId });
    return jsonResponse({ skill, deleted: true }, 200, ALLOW);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, 400, ALLOW);
  }
}
