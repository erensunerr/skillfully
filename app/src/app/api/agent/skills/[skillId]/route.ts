import { NextRequest } from "next/server";

import { ApiError } from "@/lib/agent-api";
import { requireAgentAuthor, serializeAgentSkill } from "@/lib/agent-author-api";
import { getErrorPayload, jsonResponse } from "@/lib/route-helpers";
import { requireSkillEditContext } from "@/lib/skills/authoring-access";
import {
  getDraftVersion,
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
    const access = await requireSkillEditContext({ userId: author.ownerId, email: author.email, skillId });
    const skill = access.skill;
    const version = await getDraftVersion({ store: access.store, ownerId: access.ownerId, skillId });
    const files = version
      ? await listSkillFiles({ store: access.store, ownerId: access.ownerId, skillId, versionId: version.id })
      : [];
    const targets = await listPublishingTargets({ store: access.store, ownerId: access.ownerId, skillId });

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
    const access = await requireSkillEditContext({ userId: author.ownerId, email: author.email, skillId });
    let body: { name?: unknown; description?: unknown; visibility?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "invalid json body" }, 400, "GET, PATCH, OPTIONS");
    }

    const skill = await updateSkillMetadata({
      store: access.store,
      ownerId: access.ownerId,
      skillId,
      name: body.name === undefined ? undefined : String(body.name),
      description: body.description === undefined ? undefined : String(body.description),
      visibility: body.visibility === undefined ? undefined : String(body.visibility),
    });
    const version = await getDraftVersion({ store: access.store, ownerId: access.ownerId, skillId });
    const files = version
      ? await listSkillFiles({ store: access.store, ownerId: access.ownerId, skillId, versionId: version.id })
      : [];
    const targets = await listPublishingTargets({ store: access.store, ownerId: access.ownerId, skillId });

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
    const status = error instanceof ApiError ? error.status : error instanceof Error && error.message === "skill not found" ? 404 : 500;
    return jsonResponse(getErrorPayload(error), status, "GET, PATCH, OPTIONS");
  }
}
