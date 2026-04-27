import { NextRequest } from "next/server";

import { ApiError } from "@/lib/agent-api";
import { requireAgentAuthor } from "@/lib/agent-author-api";
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

    if (result.results.some((entry) => entry.status !== "failed")) {
      await markDraftPublished({ ownerId: author.ownerId, skillId, versionId: context.version.id });
    }

    return jsonResponse(result, 200, "POST, OPTIONS");
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status, "POST, OPTIONS");
  }
}
