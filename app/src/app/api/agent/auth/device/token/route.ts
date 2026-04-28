import { NextRequest } from "next/server";

import { ApiError } from "@/lib/agent-api";
import { exchangeAgentDeviceCode } from "@/lib/agent-device-auth";
import { getErrorPayload, jsonResponse } from "@/lib/route-helpers";

export async function OPTIONS() {
  return jsonResponse({}, 200, "POST, OPTIONS");
}

export async function POST(request: NextRequest) {
  let body: { device_code?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400, "POST, OPTIONS");
  }

  try {
    const exchanged = await exchangeAgentDeviceCode({
      deviceCode: String(body.device_code ?? ""),
    });

    return jsonResponse(
      {
        token_type: exchanged.tokenType,
        access_token: exchanged.token,
        token_prefix: exchanged.tokenPrefix,
        owner_id: exchanged.ownerId,
        scope: exchanged.scope,
        token_expires_at: exchanged.tokenExpiresAt,
      },
      200,
      "POST, OPTIONS",
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status, "POST, OPTIONS");
  }
}
