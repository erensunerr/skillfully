import { NextRequest } from "next/server";

import { ApiError } from "@/lib/agent-api";
import { requireAgentAuthor, serializeAgentSkill } from "@/lib/agent-author-api";
import { getErrorPayload, jsonResponse } from "@/lib/route-helpers";
import {
  getDraftVersion,
  getSkillForOwner,
  listPublishingTargets,
  listSkillFiles,
  updateSkillMetadata,
} from "@/lib/skills/repository";

type RouteContext = { params: Promise<{ skillId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "GET, PATCH, OPTIONS");
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const author = await requireAgentAuthor(request);
    const { skillId } = await params;
    const skill = await getSkillForOwner({ ownerId: author.ownerId, skillId });
    if (!skill) {
      return jsonResponse({ error: "skill not found" }, 404, "GET, PATCH, OPTIONS");
    }
    const version = await getDraftVersion({ ownerId: author.ownerId, skillId });
    const files = version
      ? await listSkillFiles({ ownerId: author.ownerId, skillId, versionId: version.id })
      : [];
    const targets = await listPublishingTargets({ ownerId: author.ownerId, skillId });

    return jsonResponse(
      {
        skill: serializeAgentSkill({
          skill,
          version,
          files,
          targets,
          baseUrl: new URL(request.url).origin,
        }),
      },
      200,
      "GET, PATCH, OPTIONS",
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status, "GET, PATCH, OPTIONS");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const author = await requireAgentAuthor(request);
    const { skillId } = await params;
    let body: { name?: unknown; description?: unknown; visibility?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "invalid json body" }, 400, "GET, PATCH, OPTIONS");
    }

    const skill = await updateSkillMetadata({
      ownerId: author.ownerId,
      skillId,
      name: body.name === undefined ? undefined : String(body.name),
      description: body.description === undefined ? undefined : String(body.description),
      visibility: body.visibility === undefined ? undefined : String(body.visibility),
    });
    const version = await getDraftVersion({ ownerId: author.ownerId, skillId });
    const files = version
      ? await listSkillFiles({ ownerId: author.ownerId, skillId, versionId: version.id })
      : [];
    const targets = await listPublishingTargets({ ownerId: author.ownerId, skillId });

    return jsonResponse(
      {
        skill: serializeAgentSkill({
          skill,
          version,
          files,
          targets,
          baseUrl: new URL(request.url).origin,
        }),
      },
      200,
      "GET, PATCH, OPTIONS",
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status, "GET, PATCH, OPTIONS");
  }
}
