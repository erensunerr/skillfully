import { NextRequest } from "next/server";

import { adminDb } from "@/lib/adminDb";
import { ApiError } from "@/lib/agent-api";
import { requireAgentAuthor } from "@/lib/agent-author-api";
import { getErrorPayload, jsonResponse } from "@/lib/route-helpers";
import {
  getSkillForOwner,
  listDirectorySubmissions,
  listPublishRuns,
} from "@/lib/skills/repository";

type RouteContext = { params: Promise<{ skillId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "GET, OPTIONS");
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const author = await requireAgentAuthor(request);
    const { skillId } = await params;
    const skill = await getSkillForOwner({ ownerId: author.ownerId, skillId });
    if (!skill) {
      return jsonResponse({ error: "skill not found" }, 404, "GET, OPTIONS");
    }

    const rows = await adminDb.query({
      feedback: {
        $: {
          where: {
            ownerId: author.ownerId,
            skillId,
          },
        },
      },
    } as never) as { feedback?: Array<Record<string, unknown>> };
    const feedback = (rows.feedback ?? []).sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    const counts = {
      positive: feedback.filter((entry) => entry.rating === "positive").length,
      neutral: feedback.filter((entry) => entry.rating === "neutral").length,
      negative: feedback.filter((entry) => entry.rating === "negative").length,
    };
    const total = counts.positive + counts.neutral + counts.negative;
    const publishRuns = await listPublishRuns({ ownerId: author.ownerId, skillId });
    const directorySubmissions = await listDirectorySubmissions({ ownerId: author.ownerId, skillId });

    return jsonResponse(
      {
        skill_id: skillId,
        feedback: {
          total,
          counts,
          positive_rate: total === 0 ? 0 : counts.positive / total,
          recent: feedback.slice(0, 25).map((entry) => ({
            id: String(entry.id),
            rating: String(entry.rating),
            feedback: String(entry.feedback),
            created_at: Number(entry.createdAt),
          })),
        },
        publish_runs: publishRuns.slice(0, 25).map((entry) => ({
          id: String(entry.id),
          target_kind: String(entry.targetKind),
          status: String(entry.status),
          started_at: Number(entry.startedAt),
          completed_at: entry.completedAt === undefined ? null : Number(entry.completedAt),
          pull_request_url: entry.pullRequestUrl ?? null,
          error: entry.error ?? null,
          details: entry.detailsJson ?? null,
        })),
        directory_submissions: directorySubmissions.slice(0, 25).map((entry) => ({
          id: String(entry.id),
          target_kind: String(entry.targetKind),
          status: String(entry.status),
          external_url: entry.externalUrl ?? null,
          packet: entry.packetJson ?? null,
          created_at: Number(entry.createdAt),
        })),
      },
      200,
      "GET, OPTIONS",
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status, "GET, OPTIONS");
  }
}
