import { NextRequest } from "next/server";

import { ApiError, confirmLoginCode } from "@/lib/agent-api";
import { getErrorPayload, getIpHash, jsonResponse } from "@/lib/route-helpers";

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

export async function POST(request: NextRequest) {
  let body: { email?: unknown; code?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; code?: unknown };
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400);
  }

  try {
    const result = await confirmLoginCode({
      email: String(body.email ?? ""),
      code: String(body.code ?? ""),
      ipHash: getIpHash(request),
    });

    return jsonResponse(
      {
        token_type: result.tokenType,
        access_token: result.token,
        token_prefix: result.tokenPrefix,
        user_id: result.userId,
        token_expires_at: result.tokenExpiresAt,
      },
      200,
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status);
  }
}
