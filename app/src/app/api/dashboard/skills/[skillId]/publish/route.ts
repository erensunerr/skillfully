import { NextRequest } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { createGitHubAppAdapter } from "@/lib/publishing/adapters/github-app";
import { createManualDirectoryAdapter } from "@/lib/publishing/adapters/manual-directory";
import { publishSkillVersion } from "@/lib/publishing/publish";
import { jsonResponse } from "@/lib/route-helpers";
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
    const context = await buildPublishContextForSkill({ ownerId: user.id, skillId });
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
          ownerId: user.id,
          skillId,
          versionId: context.version.id,
          result: entry,
        });
      },
    });

    if (result.results.some((entry) => entry.status !== "failed")) {
      await markDraftPublished({ ownerId: user.id, skillId, versionId: context.version.id });
    }

    return jsonResponse(result, 200, "POST, OPTIONS");
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, 400, "POST, OPTIONS");
  }
}
