import { NextRequest, NextResponse } from "next/server";

import { getAgentAuthor } from "@/lib/agent-author-api";
import { getBearerToken } from "@/lib/agent-api";
import { getDashboardUser } from "@/lib/dashboard-auth";
import { jsonResponse } from "@/lib/route-helpers";
import { recordSkillUsageEventSafely } from "@/lib/skill-usage-events";
import {
  getSkillBySkillId,
  requireSkillUseAccess,
  type SkillAccessStore,
} from "@/lib/skills/access";
import { defaultSkillStore, type SkillFileRow, type SkillRow, type SkillVersionRow } from "@/lib/skills/repository";
import {
  appendSkillfullyManagedBlock,
  buildSkillManifest,
  isPrimarySkillMarkdownPath,
  normalizeSkillFilePath,
} from "@/lib/skills/skill-files";

type InstallUser = {
  id: string;
  email?: string | null;
};

type UsageEvent = {
  ownerId: string;
  skillId: string;
  eventKind: "skill_installed" | "manifest_checked" | "file_loaded";
  versionId?: string | null;
  path?: string | null;
  source?: string | null;
  request?: NextRequest;
};

type SkillInstallRouteDeps = {
  store: SkillAccessStore;
  resolveBearerUser: (token: string, request: NextRequest) => Promise<InstallUser | null>;
  recordUsage: (event: UsageEvent) => Promise<void>;
};

let testDeps: SkillInstallRouteDeps | null = null;

export function setSkillInstallRouteTestDeps(deps: SkillInstallRouteDeps | null) {
  testDeps = deps;
}

async function defaultResolveBearerUser(_token: string, request: NextRequest): Promise<InstallUser | null> {
  const dashboardUser = await getDashboardUser(request);
  if (dashboardUser) {
    return { id: dashboardUser.id, email: dashboardUser.email };
  }

  const agentAuthor = await getAgentAuthor(request);
  if (agentAuthor) {
    return { id: agentAuthor.ownerId, email: agentAuthor.email };
  }

  return null;
}

function deps(): SkillInstallRouteDeps {
  return testDeps ?? {
    store: defaultSkillStore,
    resolveBearerUser: defaultResolveBearerUser,
    recordUsage: async (event) => {
      await recordSkillUsageEventSafely(event);
    },
  };
}

async function currentStorageUrl(store: SkillAccessStore, file: SkillFileRow) {
  if (!file.storageFileId) {
    return file.storageUrl ?? null;
  }

  const fileRows = await store.query({
    $files: {
      $: {
        where: {
          id: file.storageFileId,
        },
      },
    },
  });
  const storedUrl = fileRows.$files?.[0]?.url;
  return typeof storedUrl === "string" ? storedUrl : file.storageUrl ?? null;
}

async function loadPublishedVersionAndFiles({
  store,
  skill,
}: {
  store: SkillAccessStore;
  skill: SkillRow;
}) {
  if (!skill.publishedVersionId) {
    return null;
  }

  const rows = await store.query({
    skillVersions: {
      $: {
        where: {
          skillId: skill.skillId,
          status: "published",
        },
      },
    },
    skillFiles: {
      $: {
        where: {
          skillId: skill.skillId,
          versionId: skill.publishedVersionId,
        },
      },
    },
  });
  const version = (rows.skillVersions ?? [])
    .map((row) => row as SkillVersionRow)
    .find((entry) => entry.id === skill.publishedVersionId);
  if (!version) {
    return null;
  }
  const files = (rows.skillFiles ?? [])
    .map((row) => row as SkillFileRow)
    .sort((a, b) => a.path.localeCompare(b.path));
  return { version, files };
}

async function resolveInstallSkill({
  request,
  skillId,
  publicOnly = false,
}: {
  request: NextRequest;
  skillId: string;
  publicOnly?: boolean;
}): Promise<
  | { ok: true; store: SkillAccessStore; skill: SkillRow; version: SkillVersionRow; files: SkillFileRow[] }
  | { ok: false; response: NextResponse }
> {
  const config = deps();
  const skill = await getSkillBySkillId({ store: config.store, skillId });
  if (!skill) {
    return { ok: false, response: jsonResponse({ error: "skill not found" }, 404, "GET, OPTIONS") };
  }

  const isPublic = skill.visibility === "public";
  if (publicOnly && !isPublic) {
    return { ok: false, response: jsonResponse({ error: "skill not found" }, 404, "GET, OPTIONS") };
  }

  const canUseWithLink = !publicOnly && skill.anyoneWithLinkCanUse === true;
  if (!isPublic && !canUseWithLink) {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) {
      return { ok: false, response: jsonResponse({ error: "authorization required" }, 401, "GET, OPTIONS") };
    }

    const user = await config.resolveBearerUser(token, request);
    if (!user) {
      return { ok: false, response: jsonResponse({ error: "authorization required" }, 401, "GET, OPTIONS") };
    }

    try {
      await requireSkillUseAccess({
        store: config.store,
        skillId,
        userId: user.id,
        email: user.email,
      });
    } catch {
      return { ok: false, response: jsonResponse({ error: "skill not found" }, 404, "GET, OPTIONS") };
    }
  }

  const published = await loadPublishedVersionAndFiles({ store: config.store, skill });
  if (!published) {
    return { ok: false, response: jsonResponse({ error: "published version not found" }, 404, "GET, OPTIONS") };
  }

  return {
    ok: true,
    store: config.store,
    skill,
    version: published.version,
    files: published.files,
  };
}

export async function serveSkillManifest({
  request,
  skillId,
  publicOnly = false,
}: {
  request: NextRequest;
  skillId: string;
  publicOnly?: boolean;
}) {
  const resolved = await resolveInstallSkill({ request, skillId, publicOnly });
  if (!resolved.ok) {
    return resolved.response;
  }

  const manifestFiles = await Promise.all(resolved.files.map(async (file) => ({
    id: String(file.id),
    path: String(file.path),
    kind: String(file.kind),
    contentText: typeof file.contentText === "string" ? file.contentText : null,
    storageUrl: await currentStorageUrl(resolved.store, file),
  })));

  const manifest = buildSkillManifest({
    skill: {
      skillId: resolved.skill.skillId,
      name: resolved.skill.name,
      slug: resolved.skill.slug || resolved.skill.skillId,
      description: resolved.skill.description ?? null,
    },
    version: {
      id: resolved.version.id,
      version: resolved.version.version,
      status: resolved.version.status,
    },
    files: manifestFiles,
    baseUrl: new URL(request.url).origin,
  });

  await deps().recordUsage({
    ownerId: resolved.skill.ownerId,
    skillId,
    versionId: resolved.version.id,
    eventKind: "manifest_checked",
    source: publicOnly ? "public_manifest" : "skill_manifest",
    request,
  });

  return jsonResponse(manifest, 200, "GET, OPTIONS");
}

export async function serveSkillFile({
  request,
  skillId,
  path,
  publicOnly = false,
}: {
  request: NextRequest;
  skillId: string;
  path: string[];
  publicOnly?: boolean;
}) {
  const requestedPath = normalizeSkillFilePath(path.join("/"));
  const resolved = await resolveInstallSkill({ request, skillId, publicOnly });
  if (!resolved.ok) {
    return resolved.response;
  }

  const file = resolved.files.find((entry) => entry.path === requestedPath);
  if (!file) {
    return jsonResponse({ error: "file not found" }, 404, "GET, OPTIONS");
  }

  await deps().recordUsage({
    ownerId: resolved.skill.ownerId,
    skillId,
    versionId: resolved.version.id,
    eventKind: "file_loaded",
    path: requestedPath,
    source: publicOnly ? "public_file" : "skill_file",
    request,
  });

  if (typeof file.contentText === "string") {
    const contentText = isPrimarySkillMarkdownPath(file.path)
      ? appendSkillfullyManagedBlock(file.contentText, {
          skillId,
          baseUrl: new URL(request.url).origin,
        })
      : file.contentText;
    return new NextResponse(contentText, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "content-type": file.mimeType ?? "text/plain; charset=utf-8",
      },
    });
  }

  const storageUrl = await currentStorageUrl(resolved.store, file);
  if (storageUrl) {
    return NextResponse.redirect(storageUrl);
  }

  return jsonResponse({ error: "file has no readable content" }, 404, "GET, OPTIONS");
}

export async function serveSkillInstall({
  request,
  skillId,
  publicOnly = false,
}: {
  request: NextRequest;
  skillId: string;
  publicOnly?: boolean;
}) {
  const resolved = await resolveInstallSkill({ request, skillId, publicOnly });
  if (!resolved.ok) {
    return resolved.response;
  }

  await deps().recordUsage({
    ownerId: resolved.skill.ownerId,
    skillId,
    versionId: resolved.version.id,
    eventKind: "skill_installed",
    source: publicOnly ? "public_install_api" : "install_api",
    request,
  });

  return jsonResponse(
    {
      ok: true,
      skill_id: skillId,
      manifest_url: `${new URL(request.url).origin}/api/skills/${skillId}/manifest`,
    },
    200,
    "POST, OPTIONS",
  );
}
