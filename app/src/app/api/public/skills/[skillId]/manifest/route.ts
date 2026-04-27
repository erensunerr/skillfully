import { NextRequest } from "next/server";

import { adminDb } from "@/lib/adminDb";
import { jsonResponse } from "@/lib/route-helpers";
import { buildSkillManifest } from "@/lib/skills/skill-files";

type RouteContext = { params: Promise<{ skillId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "GET, OPTIONS");
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
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
    return jsonResponse({ error: "skill not found" }, 404, "GET, OPTIONS");
  }

  const versionRows = await adminDb.query({
    skillVersions: {
      $: {
        where: {
          skillId,
          status: "published",
        },
      },
    },
    skillFiles: {
      $: {
        where: {
          skillId,
          versionId: skill.publishedVersionId,
        },
      },
    },
  } as never) as { skillVersions?: Array<Record<string, unknown>>; skillFiles?: Array<Record<string, unknown>> };
  const version = (versionRows.skillVersions ?? []).find((entry) => entry.id === skill.publishedVersionId);
  if (!version) {
    return jsonResponse({ error: "published version not found" }, 404, "GET, OPTIONS");
  }

  const manifest = buildSkillManifest({
    skill: {
      skillId: String(skill.skillId),
      name: String(skill.name),
      slug: String(skill.slug || skill.skillId),
      description: typeof skill.description === "string" ? skill.description : null,
    },
    version: {
      id: String(version.id),
      version: String(version.version),
      status: String(version.status),
    },
    files: (versionRows.skillFiles ?? []).map((file) => ({
      id: String(file.id),
      path: String(file.path),
      kind: String(file.kind),
      contentText: typeof file.contentText === "string" ? file.contentText : null,
      storageUrl: typeof file.storageUrl === "string" ? file.storageUrl : null,
    })),
  });

  return jsonResponse(manifest, 200, "GET, OPTIONS");
}
