import { NextRequest } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { jsonResponse } from "@/lib/route-helpers";
import {
  revokeSkillSharingGrant,
  updateSkillSharingGrant,
} from "@/lib/skills/sharing";

type RouteContext = { params: Promise<{ skillId: string; grantId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "PATCH, DELETE, OPTIONS");
}

function errorStatus(error: unknown) {
  if (error instanceof Error && error.message === "skill not found") {
    return 404;
  }
  return 400;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "PATCH, DELETE, OPTIONS");
  }

  let body: { permission?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400, "PATCH, DELETE, OPTIONS");
  }

  const { skillId, grantId } = await params;
  try {
    const permission = String(body.permission ?? "").trim().toLowerCase();
    if (permission !== "use" && permission !== "edit") {
      throw new Error("permission must be use or edit");
    }
    const grant = await updateSkillSharingGrant({
      skillId,
      grantId,
      actorUserId: user.id,
      actorEmail: user.email,
      permission,
    });
    return jsonResponse({ grant }, 200, "PATCH, DELETE, OPTIONS");
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, errorStatus(error), "PATCH, DELETE, OPTIONS");
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "PATCH, DELETE, OPTIONS");
  }

  const { skillId, grantId } = await params;
  try {
    const grant = await revokeSkillSharingGrant({
      skillId,
      grantId,
      actorUserId: user.id,
      actorEmail: user.email,
    });
    return jsonResponse({ grant }, 200, "PATCH, DELETE, OPTIONS");
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, errorStatus(error), "PATCH, DELETE, OPTIONS");
  }
}
