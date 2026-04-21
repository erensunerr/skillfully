import { NextRequest, NextResponse } from "next/server";

import { requestLoginCode, ApiError } from "@/lib/agent-api";

function jsonResponse(payload: Record<string, string | number>, status: number) {
  const response = NextResponse.json(payload, { status });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "content-type");
  return response;
}

function getErrorPayload(error: unknown) {
  if (error instanceof ApiError) {
    return { ...error.payload };
  }
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: "unknown error" };
}

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

  try {
    const result = await requestLoginCode({ email });
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
