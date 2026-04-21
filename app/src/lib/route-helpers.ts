import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { ApiError } from "@/lib/agent-api";

const DEFAULT_ALLOWED_ORIGIN = "*";
const DEFAULT_ALLOW_METHODS = "POST, OPTIONS";
const DEFAULT_ALLOW_HEADERS = "authorization, content-type";

type ErrorPayload = { error: string };

function getIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0];
    if (first) return first.trim();
  }

  return request.headers.get("x-real-ip") || "unknown";
}

export function hashIp(ip: string) {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export function getIpHash(request: NextRequest): string {
  return hashIp(getIp(request));
}

export function jsonResponse(
  payload: unknown,
  status: number,
  methods = DEFAULT_ALLOW_METHODS,
  headers = DEFAULT_ALLOW_HEADERS,
) {
  const response = NextResponse.json(payload, { status });
  response.headers.set("Access-Control-Allow-Origin", DEFAULT_ALLOWED_ORIGIN);
  response.headers.set("Access-Control-Allow-Methods", methods);
  response.headers.set("Access-Control-Allow-Headers", headers);
  return response;
}

export function getErrorPayload(error: unknown): ErrorPayload {
  if (error instanceof ApiError) {
    return { error: error.payload.error, ...error.payload };
  }
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: "unknown error" };
}
