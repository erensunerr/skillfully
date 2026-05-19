import { NextRequest } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { captureServerEvent } from "@/lib/posthog-server";
import { createGitHubAppAdapter } from "@/lib/publishing/adapters/github-app";
import { createManualDirectoryAdapter } from "@/lib/publishing/adapters/manual-directory";
import { publishSkillVersion } from "@/lib/publishing/publish";
import { jsonResponse } from "@/lib/route-helpers";
import { requireSkillEditContext } from "@/lib/skills/authoring-access";
import { buildPublishContextForSkill, markDraftPublished, recordPublishResult } from "@/lib/skills/repository";

type RouteContext = { params: Promise<{ skillId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "POST, OPTIONS");
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "POST, OPTIONS");
  }

  const { skillId } = await params;
  try {
    const access = await requireSkillEditContext({ userId: user.id, email: user.email, skillId });
    const context = await buildPublishContextForSkill({ store: access.store, ownerId: access.ownerId, skillId });
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
          store: access.store,
          ownerId: access.ownerId,
          skillId,
          versionId: context.version.id,
          result: entry,
        });
      },
    });

    const published = result.results.some((entry) => entry.status === "published" || entry.status === "submitted");
    if (published) {
      await markDraftPublished({ store: access.store, ownerId: access.ownerId, skillId, versionId: context.version.id });
      await captureServerEvent({
        distinctId: user.id,
        event: "skill_published",
        properties: {
          skill_id: skillId,
          skill_name: context.skill.name,
          version_id: context.version.id,
          version: context.version.version,
          source_mode: context.skill.sourceMode ?? "managed",
          author_type: "human",
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
        distinctId: user.id,
        event: "skill_publish_failed",
        properties: {
          skill_id: skillId,
          skill_name: context.skill.name,
          version_id: context.version.id,
          author_type: "human",
          result_statuses: result.results.map((entry) => `${entry.targetKind}:${entry.status}`),
        },
      });
    }

    return jsonResponse(result, 200, "POST, OPTIONS");
  } catch (error) {
    const status = error instanceof Error && error.message === "skill not found" ? 404 : 400;
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, status, "POST, OPTIONS");
  }
}
