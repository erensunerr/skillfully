import { NextRequest } from "next/server";

import { ApiError } from "@/lib/agent-api";
import { requireAgentAuthor } from "@/lib/agent-author-api";
import { getErrorPayload, jsonResponse } from "@/lib/route-helpers";
import {
  revokeSkillSharingGrant,
  updateSkillSharingGrant,
} from "@/lib/skills/sharing";

type RouteContext = { params: Promise<{ skillId: string; grantId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "PATCH, DELETE, OPTIONS");
}

function statusFor(error: unknown) {
  if (error instanceof ApiError) {
    return error.status;
  }
  if (error instanceof Error && error.message === "skill not found") {
    return 404;
  }
  return 400;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const author = await requireAgentAuthor(request);
    let body: { permission?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "invalid json body" }, 400, "PATCH, DELETE, OPTIONS");
    }
    const permission = String(body.permission ?? "").trim().toLowerCase();
    if (permission !== "use" && permission !== "edit") {
      throw new Error("permission must be use or edit");
    }

    const { skillId, grantId } = await params;
    const grant = await updateSkillSharingGrant({
      skillId,
      grantId,
      actorUserId: author.ownerId,
      actorEmail: author.email,
      permission,
    });
    return jsonResponse({ grant }, 200, "PATCH, DELETE, OPTIONS");
  } catch (error) {
    return jsonResponse(getErrorPayload(error), statusFor(error), "PATCH, DELETE, OPTIONS");
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const author = await requireAgentAuthor(request);
    const { skillId, grantId } = await params;
    const grant = await revokeSkillSharingGrant({
      skillId,
      grantId,
      actorUserId: author.ownerId,
      actorEmail: author.email,
    });
    return jsonResponse({ grant }, 200, "PATCH, DELETE, OPTIONS");
  } catch (error) {
    return jsonResponse(getErrorPayload(error), statusFor(error), "PATCH, DELETE, OPTIONS");
  }
}
