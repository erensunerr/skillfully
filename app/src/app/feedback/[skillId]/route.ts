import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

import { adminDb } from "@/lib/adminDb";
import { getPostHogClient } from "@/lib/posthog-server";
import { ApiError, getBearerToken, listFeedbackForSkill } from "@/lib/agent-api";

type RouteContext = { params: Promise<{ skillId: string }> };

const ALLOWED_RATINGS = new Set(["positive", "negative", "neutral"]);
const MAX_FEEDBACK_LENGTH = 2000;
const MAX_REQUESTS_PER_MINUTE = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

function getIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0];
    if (first) return first.trim();
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function hashIp(ip: string) {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function jsonResponse(
  payload: unknown,
  status: number,
  methods = "POST, OPTIONS",
) {
  const response = NextResponse.json(payload, { status });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", methods);
  response.headers.set("Access-Control-Allow-Headers", "authorization, content-type");
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
  return jsonResponse({}, 200, "GET, POST, OPTIONS");
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { skillId } = await params;
  if (!skillId) {
    return jsonResponse({ error: "skill_id required" }, 400);
  }

  let body: { rating?: string; feedback?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400);
  }

  const rating = String(body.rating ?? "").trim().toLowerCase();
  const feedback = String(body.feedback ?? "").trim();

  if (!ALLOWED_RATINGS.has(rating)) {
    return jsonResponse(
      { error: "missing or invalid required field: rating" },
      400,
    );
  }

  if (!feedback) {
    return jsonResponse(
      { error: "missing required field: feedback" },
      400,
    );
  }

  if (feedback.length > MAX_FEEDBACK_LENGTH) {
    return jsonResponse(
      { error: `feedback exceeds ${MAX_FEEDBACK_LENGTH} characters` },
      400,
    );
  }

  const { skills } = await adminDb.query({
    skills: {
      $: {
        where: {
          skillId,
        },
      },
    },
  });

  const skill = skills[0];
  if (!skill) {
    return jsonResponse({ error: "skill not found" }, 404);
  }

  const now = Date.now();
  const ipHash = hashIp(getIp(request));

  const { feedback: recentFeedback } = await adminDb.query({
    feedback: {
      $: {
        where: {
          ipHash,
          createdAt: { $gt: now - RATE_LIMIT_WINDOW_MS },
        },
      },
    },
  });

  if (recentFeedback.length >= MAX_REQUESTS_PER_MINUTE) {
    return jsonResponse({ error: "rate limit exceeded" }, 429);
  }

  const feedbackRecordId = crypto.randomUUID();

  await adminDb.transact([
    adminDb.tx.feedback[feedbackRecordId].create({
      ownerId: skill.ownerId,
      skillId,
      rating,
      feedback,
      ipHash,
      createdAt: now,
    }),
  ]);

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: skill.ownerId,
    event: "feedback_received",
    properties: {
      skill_id: skillId,
      skill_name: skill.name,
      rating,
    },
  });
  await posthog.shutdown();

  return jsonResponse({}, 201);
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { skillId } = await params;
  const token = getBearerToken(request.headers.get("authorization"));

  if (!token) {
    return jsonResponse({ error: "missing Authorization: Bearer <token>" }, 401, "GET, OPTIONS");
  }

  const searchParams = request.nextUrl.searchParams;
  try {
    const result = await listFeedbackForSkill({
      token,
      skillId,
      rating: searchParams.get("rating"),
      sort: searchParams.get("sort"),
      limit: searchParams.get("limit"),
      cursor: searchParams.get("cursor"),
    });

    return jsonResponse(result, 200, "GET, OPTIONS");
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status, "GET, OPTIONS");
  }
}
