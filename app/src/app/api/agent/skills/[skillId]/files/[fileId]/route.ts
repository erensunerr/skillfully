import { NextRequest } from "next/server";

import { ApiError } from "@/lib/agent-api";
import { requireAgentAuthor } from "@/lib/agent-author-api";
import { getErrorPayload, jsonResponse } from "@/lib/route-helpers";
import { requireSkillEditContext } from "@/lib/skills/authoring-access";
import { updateSkillFileText } from "@/lib/skills/repository";

type RouteContext = { params: Promise<{ skillId: string; fileId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "PATCH, OPTIONS");
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const author = await requireAgentAuthor(request);
    let body: { content_text?: unknown; path?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "invalid json body" }, 400, "PATCH, OPTIONS");
    }

    const { skillId, fileId } = await params;
    const access = await requireSkillEditContext({ userId: author.ownerId, email: author.email, skillId });
    const file = await updateSkillFileText({
      store: access.store,
      ownerId: access.ownerId,
      skillId,
      fileId,
      contentText: String(body.content_text ?? ""),
      path: body.path === undefined ? undefined : String(body.path),
    });
    return jsonResponse({ file }, 200, "PATCH, OPTIONS");
  } catch (error) {
    const status = error instanceof ApiError ? error.status : error instanceof Error && error.message === "skill not found" ? 404 : 500;
    return jsonResponse(getErrorPayload(error), status, "PATCH, OPTIONS");
  }
}
