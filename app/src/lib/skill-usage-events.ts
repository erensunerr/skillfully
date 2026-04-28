import crypto from "node:crypto";
import type { NextRequest } from "next/server";

import { adminDb } from "@/lib/adminDb";
import { getIpHash } from "@/lib/route-helpers";

export type SkillUsageEventKind =
  | "public_page_view"
  | "skill_installed"
  | "manifest_checked"
  | "file_loaded"
  | "feedback_received";

type SkillUsageEventInput = {
  ownerId: string;
  skillId: string;
  eventKind: SkillUsageEventKind;
  versionId?: string | null;
  path?: string | null;
  source?: string | null;
  request?: NextRequest;
  metadataJson?: Record<string, unknown>;
  now?: number;
};

function dayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function usageSubjectHash(request: NextRequest | undefined) {
  if (!request) {
    return undefined;
  }

  const userAgent = request.headers.get("user-agent") || "unknown-agent";
  return hashValue(`${getIpHash(request)}:${userAgent}`);
}

export async function recordSkillUsageEvent({
  ownerId,
  skillId,
  eventKind,
  versionId,
  path,
  source,
  request,
  metadataJson,
  now = Date.now(),
}: SkillUsageEventInput) {
  const eventId = crypto.randomUUID();
  const subjectHash = usageSubjectHash(request);

  await adminDb.transact([
    adminDb.tx.skillUsageEvents[eventId].create({
      ownerId,
      skillId,
      eventKind,
      ...(versionId ? { versionId } : {}),
      ...(path ? { path } : {}),
      ...(source ? { source } : {}),
      ...(subjectHash ? { subjectHash } : {}),
      dayKey: dayKey(now),
      ...(metadataJson ? { metadataJson } : {}),
      createdAt: now,
    }),
  ]);
}

export async function recordSkillUsageEventSafely(input: SkillUsageEventInput) {
  try {
    await recordSkillUsageEvent(input);
  } catch (error) {
    console.error("Unable to record Skillfully usage event", error);
  }
}
