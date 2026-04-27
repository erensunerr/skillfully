import { NextRequest } from "next/server";

import { ApiError } from "@/lib/agent-api";
import { approveAgentDeviceAuthorization } from "@/lib/agent-device-auth";
import { getDashboardUser } from "@/lib/dashboard-auth";
import { getErrorPayload, jsonResponse } from "@/lib/route-helpers";

export async function OPTIONS() {
  return jsonResponse({}, 200, "POST, OPTIONS");
}

export async function POST(request: NextRequest) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "POST, OPTIONS");
  }

  let body: { user_code?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400, "POST, OPTIONS");
  }

  try {
    const approved = await approveAgentDeviceAuthorization({
      userCode: String(body.user_code ?? ""),
      ownerId: user.id,
    });

    return jsonResponse(
      {
        user_code: approved.userCode,
        agent_name: approved.agentName,
        scope: approved.scope,
        status: approved.status,
        expires_at: approved.expiresAt,
      },
      200,
      "POST, OPTIONS",
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status, "POST, OPTIONS");
  }
}
