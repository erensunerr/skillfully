import { NextRequest } from "next/server";

import { ApiError } from "@/lib/agent-api";
import { requireAgentAuthor } from "@/lib/agent-author-api";
import { getErrorPayload, jsonResponse } from "@/lib/route-helpers";
import { requireSkillEditContext } from "@/lib/skills/authoring-access";
import {
  createSkillFile,
  getDraftVersion,
  listSkillFiles,
} from "@/lib/skills/repository";

type RouteContext = { params: Promise<{ skillId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "GET, POST, OPTIONS");
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const author = await requireAgentAuthor(request);
    const { skillId } = await params;
    const access = await requireSkillEditContext({ userId: author.ownerId, email: author.email, skillId });
    const version = await getDraftVersion({ store: access.store, ownerId: access.ownerId, skillId });
    if (!version) {
      return jsonResponse({ error: "draft version not found" }, 404, "GET, POST, OPTIONS");
    }
    const files = await listSkillFiles({ store: access.store, ownerId: access.ownerId, skillId, versionId: version.id });
    return jsonResponse({ files }, 200, "GET, POST, OPTIONS");
  } catch (error) {
    const status = error instanceof ApiError ? error.status : error instanceof Error && error.message === "skill not found" ? 404 : 500;
    return jsonResponse(getErrorPayload(error), status, "GET, POST, OPTIONS");
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const author = await requireAgentAuthor(request);
    const { skillId } = await params;
    const access = await requireSkillEditContext({ userId: author.ownerId, email: author.email, skillId });
    const version = await getDraftVersion({ store: access.store, ownerId: access.ownerId, skillId });
    if (!version) {
      return jsonResponse({ error: "draft version not found" }, 404, "GET, POST, OPTIONS");
    }

    let body: { path?: unknown; content_text?: unknown; kind?: unknown; mime_type?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "invalid json body" }, 400, "GET, POST, OPTIONS");
    }

    const file = await createSkillFile({
      store: access.store,
      ownerId: access.ownerId,
      skillId,
      versionId: version.id,
      path: String(body.path ?? "SKILL.md"),
      kind: body.kind ? String(body.kind) : "markdown",
      mimeType: body.mime_type ? String(body.mime_type) : "text/markdown",
      contentText: String(body.content_text ?? ""),
    });

    return jsonResponse({ file }, 201, "GET, POST, OPTIONS");
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status, "GET, POST, OPTIONS");
  }
}
