import { NextRequest } from "next/server";

import { ApiError } from "@/lib/agent-api";
import { requireAgentAuthor } from "@/lib/agent-author-api";
import { captureServerEvent } from "@/lib/posthog-server";
import { createGitHubAppAdapter } from "@/lib/publishing/adapters/github-app";
import { createManualDirectoryAdapter } from "@/lib/publishing/adapters/manual-directory";
import { publishSkillVersion } from "@/lib/publishing/publish";
import { getErrorPayload, jsonResponse } from "@/lib/route-helpers";
import { buildPublishContextForSkill, markDraftPublished, recordPublishResult } from "@/lib/skills/repository";

type RouteContext = { params: Promise<{ skillId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "POST, OPTIONS");
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const author = await requireAgentAuthor(request);
    const { skillId } = await params;
    const context = await buildPublishContextForSkill({ ownerId: author.ownerId, skillId });
    const result = await publishSkillVersion({
      context,
      adapters: [
        createGitHubAppAdapter(),
        createManualDirectoryAdapter("lobehub"),
        createManualDirectoryAdapter("clawhub"),
        createManualDirectoryAdapter("hermes"),
      ],
      recordResult: async (entry) => {
        await recordPublishResult({
          ownerId: author.ownerId,
          skillId,
          versionId: context.version.id,
          result: entry,
        });
      },
    });

    const published = result.results.some((entry) => entry.status === "published" || entry.status === "submitted");
    if (published) {
      await markDraftPublished({ ownerId: author.ownerId, skillId, versionId: context.version.id });
      await captureServerEvent({
        distinctId: author.ownerId,
        event: "skill_published",
        properties: {
          skill_id: skillId,
          skill_name: context.skill.name,
          version_id: context.version.id,
          version: context.version.version,
          source_mode: context.skill.sourceMode ?? "managed",
          author_type: "agent",
          successful_targets: result.results
            .filter((entry) => entry.status !== "failed")
            .map((entry) => entry.targetKind),
          failed_targets: result.results
            .filter((entry) => entry.status === "failed")
            .map((entry) => entry.targetKind),
        },
      });
    } else {
      await captureServerEvent({
        distinctId: author.ownerId,
        event: "skill_publish_failed",
        properties: {
          skill_id: skillId,
          skill_name: context.skill.name,
          version_id: context.version.id,
          author_type: "agent",
          result_statuses: result.results.map((entry) => `${entry.targetKind}:${entry.status}`),
        },
      });
    }

    return jsonResponse(result, 200, "POST, OPTIONS");
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status, "POST, OPTIONS");
  }
}
