import { NextRequest } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { jsonResponse } from "@/lib/route-helpers";
import { requireSkillEditContext } from "@/lib/skills/authoring-access";
import { deleteSkillFile, updateSkillFileText } from "@/lib/skills/repository";
import { SkillFrontmatterValidationError } from "@/lib/skills/skill-frontmatter";

type RouteContext = { params: Promise<{ skillId: string; fileId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "PATCH, DELETE, OPTIONS");
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "PATCH, DELETE, OPTIONS");
  }

  const { skillId, fileId } = await params;
  let body: { content_text?: unknown; path?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400, "PATCH, DELETE, OPTIONS");
  }

  try {
    const access = await requireSkillEditContext({ userId: user.id, email: user.email, skillId });
    const file = await updateSkillFileText({
      store: access.store,
      ownerId: access.ownerId,
      skillId,
      fileId,
      contentText: String(body.content_text ?? ""),
      path: body.path === undefined ? undefined : String(body.path),
    });
    return jsonResponse({ file }, 200, "PATCH, DELETE, OPTIONS");
  } catch (error) {
    const status = error instanceof SkillFrontmatterValidationError ? 400 : 404;
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, status, "PATCH, DELETE, OPTIONS");
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "PATCH, DELETE, OPTIONS");
  }

  const { skillId, fileId } = await params;
  try {
    const access = await requireSkillEditContext({ userId: user.id, email: user.email, skillId });
    const file = await deleteSkillFile({ store: access.store, ownerId: access.ownerId, skillId, fileId });
    return jsonResponse({ file }, 200, "PATCH, DELETE, OPTIONS");
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, 404, "PATCH, DELETE, OPTIONS");
  }
}
