import { NextRequest } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { jsonResponse } from "@/lib/route-helpers";
import { updateSkillFileText } from "@/lib/skills/repository";

type RouteContext = { params: Promise<{ skillId: string; fileId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "PATCH, OPTIONS");
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "PATCH, OPTIONS");
  }

  const { fileId } = await params;
  let body: { content_text?: unknown; path?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400, "PATCH, OPTIONS");
  }

  try {
    const file = await updateSkillFileText({
      ownerId: user.id,
      fileId,
      contentText: String(body.content_text ?? ""),
      path: body.path === undefined ? undefined : String(body.path),
    });
    return jsonResponse({ file }, 200, "PATCH, OPTIONS");
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, 404, "PATCH, OPTIONS");
  }
}
