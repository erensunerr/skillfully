import { NextRequest } from "next/server";

import { adminDb } from "@/lib/adminDb";
import { jsonResponse } from "@/lib/route-helpers";
import { recordSkillUsageEventSafely } from "@/lib/skill-usage-events";

type RouteContext = { params: Promise<{ skillId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "POST, OPTIONS");
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { skillId } = await params;
  const data = await adminDb.query({
    skills: {
      $: {
        where: {
          skillId,
        },
      },
    },
  } as never) as { skills?: Array<Record<string, unknown>> };
  const skill = data.skills?.[0];
  if (!skill || skill.visibility !== "public" || !skill.publishedVersionId) {
    return jsonResponse({ error: "skill not found" }, 404, "POST, OPTIONS");
  }

  await recordSkillUsageEventSafely({
    ownerId: String(skill.ownerId),
    skillId,
    versionId: String(skill.publishedVersionId),
    eventKind: "skill_installed",
    source: "install_api",
    request,
  });

  return jsonResponse(
    {
      ok: true,
      skill_id: skillId,
      manifest_url: `${new URL(request.url).origin}/api/public/skills/${skillId}/manifest`,
    },
    200,
    "POST, OPTIONS",
  );
}
