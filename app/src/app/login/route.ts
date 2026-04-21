import { NextRequest } from "next/server";

import { requestLoginCode, ApiError } from "@/lib/agent-api";
import { getErrorPayload, getIpHash, jsonResponse } from "@/lib/route-helpers";

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

export async function POST(request: NextRequest) {
  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400);
  }

  const email = String(body.email ?? "");
  const ipHash = getIpHash(request);

  try {
    const result = await requestLoginCode({ email, ipHash });
    return jsonResponse(
      {
        message: result.message,
        user_id: result.userId,
        email: result.email,
        code_expires_at: result.codeExpiresAt,
      },
      200,
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status);
  }
}
