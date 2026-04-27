import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/adminDb";
import { jsonResponse } from "@/lib/route-helpers";
import { normalizeSkillFilePath } from "@/lib/skills/skill-files";

type RouteContext = { params: Promise<{ skillId: string; path: string[] }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { skillId, path } = await params;
  const requestedPath = normalizeSkillFilePath(path.join("/"));
  const skillRows = await adminDb.query({
    skills: {
      $: {
        where: {
          skillId,
        },
      },
    },
  } as never) as { skills?: Array<Record<string, unknown>> };
  const skill = skillRows.skills?.[0];
  if (!skill || skill.visibility !== "public" || !skill.publishedVersionId) {
    return jsonResponse({ error: "skill not found" }, 404, "GET, OPTIONS");
  }

  const fileRows = await adminDb.query({
    skillFiles: {
      $: {
        where: {
          skillId,
          versionId: skill.publishedVersionId,
          path: requestedPath,
        },
      },
    },
  } as never) as { skillFiles?: Array<Record<string, unknown>> };
  const file = fileRows.skillFiles?.[0];
  if (!file) {
    return jsonResponse({ error: "file not found" }, 404, "GET, OPTIONS");
  }

  if (typeof file.contentText === "string") {
    return new NextResponse(file.contentText, {
      status: 200,
      headers: {
        "content-type": typeof file.mimeType === "string" ? file.mimeType : "text/plain; charset=utf-8",
      },
    });
  }

  if (typeof file.storageUrl === "string") {
    return NextResponse.redirect(file.storageUrl);
  }

  return jsonResponse({ error: "file has no readable content" }, 404, "GET, OPTIONS");
}
