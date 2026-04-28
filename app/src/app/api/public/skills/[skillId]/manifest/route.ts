import { NextRequest } from "next/server";

import { adminDb } from "@/lib/adminDb";
import { jsonResponse } from "@/lib/route-helpers";
import { recordSkillUsageEventSafely } from "@/lib/skill-usage-events";
import { buildSkillManifest } from "@/lib/skills/skill-files";

type RouteContext = { params: Promise<{ skillId: string }> };

async function currentStorageUrl(file: Record<string, unknown>) {
  if (typeof file.storageFileId !== "string") {
    return typeof file.storageUrl === "string" ? file.storageUrl : null;
  }

  const fileRows = await adminDb.query({
    $files: {
      $: {
        where: {
          id: file.storageFileId,
        },
      },
    },
  } as never) as { $files?: Array<{ url?: string }> };
  return fileRows.$files?.[0]?.url || (typeof file.storageUrl === "string" ? file.storageUrl : null);
}

export async function OPTIONS() {
  return jsonResponse({}, 200, "GET, OPTIONS");
}

export async function GET(request: NextRequest, { params }: RouteContext) {
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

  const manifestFiles = await Promise.all((versionRows.skillFiles ?? []).map(async (file) => ({
    id: String(file.id),
    path: String(file.path),
    kind: String(file.kind),
    contentText: typeof file.contentText === "string" ? file.contentText : null,
    storageUrl: await currentStorageUrl(file),
  })));

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
    files: manifestFiles,
    baseUrl: new URL(request.url).origin,
  });

  await recordSkillUsageEventSafely({
    ownerId: String(skill.ownerId),
    skillId,
    versionId: String(skill.publishedVersionId),
    eventKind: "manifest_checked",
    source: "public_manifest",
    request,
  });

  return jsonResponse(manifest, 200, "GET, OPTIONS");
}
