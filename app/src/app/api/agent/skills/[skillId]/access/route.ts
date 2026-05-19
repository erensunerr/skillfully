import { NextRequest } from "next/server";

import { ApiError } from "@/lib/agent-api";
import { requireAgentAuthor } from "@/lib/agent-author-api";
import { getErrorPayload, jsonResponse } from "@/lib/route-helpers";
import {
  grantSkillSharingAccess,
  listSkillSharingGrants,
  parseSkillSharingBody,
} from "@/lib/skills/sharing";

type RouteContext = { params: Promise<{ skillId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "GET, POST, OPTIONS");
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

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const author = await requireAgentAuthor(request);
    const { skillId } = await params;
    const grants = await listSkillSharingGrants({
      skillId,
      actorUserId: author.ownerId,
      actorEmail: author.email,
    });
    return jsonResponse({ grants }, 200, "GET, POST, OPTIONS");
  } catch (error) {
    return jsonResponse(getErrorPayload(error), statusFor(error), "GET, POST, OPTIONS");
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const author = await requireAgentAuthor(request);
    let body: { email?: unknown; permission?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "invalid json body" }, 400, "GET, POST, OPTIONS");
    }

    const { skillId } = await params;
    const parsed = parseSkillSharingBody(body);
    const result = await grantSkillSharingAccess({
      skillId,
      actorUserId: author.ownerId,
      actorEmail: author.email,
      granteeEmail: parsed.email,
      permission: parsed.permission,
      baseUrl: new URL(request.url).origin,
    });
    return jsonResponse(result, 200, "GET, POST, OPTIONS");
  } catch (error) {
    return jsonResponse(getErrorPayload(error), statusFor(error), "GET, POST, OPTIONS");
  }
}
