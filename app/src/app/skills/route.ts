import { NextRequest } from "next/server";

import {
  ApiError,
  createTrackedSkill,
  getBearerToken,
} from "@/lib/agent-api";
import { getErrorPayload, jsonResponse } from "@/lib/route-helpers";

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) {
    return jsonResponse({ error: "missing Authorization: Bearer <token>" }, 401);
  }

  let body: { name?: unknown; description?: unknown };
  try {
    body = (await request.json()) as { name?: unknown; description?: unknown };
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400);
  }

  const name = String(body.name ?? "");
  const description = body.description === undefined ? undefined : String(body.description);
  const origin = new URL(request.url).origin;

  try {
    const result = await createTrackedSkill({
      token,
      name,
      description,
      baseUrl: origin,
    });

    return jsonResponse(
      {
        id: result.id,
        skill_id: result.skillId,
        name: result.name,
        description: result.description ?? null,
        feedback_url: result.feedbackUrl,
        snippet: result.snippet,
        created_at: result.createdAt,
      },
      201,
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status);
  }
}
