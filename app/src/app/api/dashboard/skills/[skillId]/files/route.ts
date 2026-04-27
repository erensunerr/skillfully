import crypto from "node:crypto";
import { NextRequest } from "next/server";

import { adminDb } from "@/lib/adminDb";
import { getDashboardUser } from "@/lib/dashboard-auth";
import { jsonResponse } from "@/lib/route-helpers";
import { normalizeSkillFilePath } from "@/lib/skills/skill-files";
import { createSkillFile, getDraftVersion, getSkillForOwner, listSkillFiles } from "@/lib/skills/repository";

type RouteContext = { params: Promise<{ skillId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "GET, POST, OPTIONS");
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "GET, POST, OPTIONS");
  }
  const { skillId } = await params;
  const version = await getDraftVersion({ ownerId: user.id, skillId });
  if (!version) {
    return jsonResponse({ error: "draft version not found" }, 404, "GET, POST, OPTIONS");
  }

  const files = await listSkillFiles({ ownerId: user.id, skillId, versionId: version.id });
  return jsonResponse({ files }, 200, "GET, POST, OPTIONS");
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "GET, POST, OPTIONS");
  }
  const { skillId } = await params;
  const skill = await getSkillForOwner({ ownerId: user.id, skillId });
  const version = await getDraftVersion({ ownerId: user.id, skillId });
  if (!skill || !version) {
    return jsonResponse({ error: "skill or draft version not found" }, 404, "GET, POST, OPTIONS");
  }

  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return jsonResponse({ error: "missing file" }, 400, "GET, POST, OPTIONS");
      }
      const requestedPath = normalizeSkillFilePath(String(formData.get("path") || file.name));
      const buffer = Buffer.from(await file.arrayBuffer());
      const storagePath = `skills/${user.id}/${skillId}/${version.id}/${crypto.randomUUID()}/${requestedPath}`;
      const uploaded = await adminDb.storage.uploadFile(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
      });
      const fileRows = await adminDb.query({
        $files: {
          $: {
            where: {
              path: storagePath,
            },
          },
        },
      } as never) as { $files?: Array<{ id: string; url?: string }> };
      const storageFile = fileRows.$files?.[0];
      const created = await createSkillFile({
        ownerId: user.id,
        skillId,
        versionId: version.id,
        path: requestedPath,
        kind: "asset",
        mimeType: file.type || "application/octet-stream",
        storageFileId: uploaded.data.id,
        storageUrl: storageFile?.url,
      });
      return jsonResponse({ file: created }, 201, "GET, POST, OPTIONS");
    }

    const body = await request.json() as { path?: unknown; content_text?: unknown; kind?: unknown; mime_type?: unknown };
    const created = await createSkillFile({
      ownerId: user.id,
      skillId,
      versionId: version.id,
      path: String(body.path ?? "SKILL.md"),
      kind: body.kind ? String(body.kind) : "markdown",
      mimeType: body.mime_type ? String(body.mime_type) : "text/markdown",
      contentText: String(body.content_text ?? ""),
    });
    return jsonResponse({ file: created }, 201, "GET, POST, OPTIONS");
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, 400, "GET, POST, OPTIONS");
  }
}
