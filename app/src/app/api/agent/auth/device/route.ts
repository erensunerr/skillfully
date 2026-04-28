import { NextRequest } from "next/server";

import { ApiError } from "@/lib/agent-api";
import { createAgentDeviceAuthorization } from "@/lib/agent-device-auth";
import { getErrorPayload, jsonResponse } from "@/lib/route-helpers";

export async function OPTIONS() {
  return jsonResponse({}, 200, "POST, OPTIONS");
}

export async function POST(request: NextRequest) {
  let body: { agent_name?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const created = await createAgentDeviceAuthorization({
      agentName: body.agent_name === undefined ? undefined : String(body.agent_name),
      baseUrl: new URL(request.url).origin,
    });

    return jsonResponse(
      {
        device_code: created.deviceCode,
        user_code: created.userCode,
        verification_uri: created.verificationUri,
        verification_uri_complete: created.verificationUriComplete,
        expires_in: created.expiresIn,
        interval: created.interval,
      },
      201,
      "POST, OPTIONS",
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status, "POST, OPTIONS");
  }
}
