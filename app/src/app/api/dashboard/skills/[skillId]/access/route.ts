import { NextRequest } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { jsonResponse } from "@/lib/route-helpers";
import {
  grantSkillSharingAccess,
  listSkillSharingGrants,
  parseSkillSharingBody,
} from "@/lib/skills/sharing";

type RouteContext = { params: Promise<{ skillId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "GET, POST, OPTIONS");
}

function errorStatus(error: unknown) {
  if (error instanceof Error && error.message === "skill not found") {
    return 404;
  }
  return 400;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "GET, POST, OPTIONS");
  }

  const { skillId } = await params;
  try {
    const grants = await listSkillSharingGrants({
      skillId,
      actorUserId: user.id,
      actorEmail: user.email,
    });
    return jsonResponse({ grants }, 200, "GET, POST, OPTIONS");
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, errorStatus(error), "GET, POST, OPTIONS");
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "GET, POST, OPTIONS");
  }

  let body: { email?: unknown; permission?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400, "GET, POST, OPTIONS");
  }

  const { skillId } = await params;
  try {
    const parsed = parseSkillSharingBody(body);
    const result = await grantSkillSharingAccess({
      skillId,
      actorUserId: user.id,
      actorEmail: user.email,
      granteeEmail: parsed.email,
      permission: parsed.permission,
      baseUrl: new URL(request.url).origin,
    });
    return jsonResponse(result, 200, "GET, POST, OPTIONS");
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, errorStatus(error), "GET, POST, OPTIONS");
  }
}
