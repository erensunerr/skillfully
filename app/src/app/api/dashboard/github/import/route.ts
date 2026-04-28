import crypto from "node:crypto";
import { NextRequest } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { captureServerEvent } from "@/lib/posthog-server";
import { createGitHubAppInstallationToken } from "@/lib/publishing/adapters/github-app";
import { jsonResponse } from "@/lib/route-helpers";
import { skillSlug } from "@/lib/skills/skill-files";
import {
  createSkillDraft,
  defaultSkillStore,
  listPublishingTargets,
  listSkillsForOwner,
  updateSkillFileText,
} from "@/lib/skills/repository";

type GitHubTree = {
  tree: Array<{ path: string; type: string }>;
};

function randomSkillId() {
  const chars = "abcdefghijkmnopqrstuvwxyz23456789";
  let out = "sk_";
  for (let index = 0; index < 10; index += 1) {
    out += chars[crypto.randomInt(0, chars.length)];
  }
  return out;
}

async function githubJson<T>(token: string, path: string) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub request failed ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

function parseSkillName(markdown: string, fallback: string) {
  const frontmatterName = markdown.match(/^---[\s\S]*?\nname:\s*["']?([^"'\n]+)["']?[\s\S]*?\n---/m)?.[1];
  if (frontmatterName?.trim()) {
    return frontmatterName.trim();
  }
  const headingName = markdown.match(/^#\s+(.+)$/m)?.[1];
  if (headingName?.trim()) {
    return headingName.trim();
  }
  return fallback;
}

export async function OPTIONS() {
  return jsonResponse({}, 200, "POST, OPTIONS");
}

export async function POST(request: NextRequest) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "POST, OPTIONS");
  }

  let body: {
    repo_full_name?: unknown;
    installation_id?: unknown;
    base_branch?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400, "POST, OPTIONS");
  }

  const repoFullName = String(body.repo_full_name ?? "").trim();
  const installationId = String(body.installation_id ?? "").trim();
  if (!repoFullName || !installationId) {
    return jsonResponse({ error: "repo_full_name and installation_id are required" }, 400, "POST, OPTIONS");
  }

  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
    return jsonResponse({ error: "GitHub App credentials are not configured" }, 400, "POST, OPTIONS");
  }

  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    return jsonResponse({ error: "invalid repo_full_name" }, 400, "POST, OPTIONS");
  }

  try {
    const token = await createGitHubAppInstallationToken({
      fetcher: fetch,
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
      installationId,
    });
    const repoInfo = await githubJson<{ default_branch: string }>(token, `/repos/${owner}/${repo}`);
    const branch = String(body.base_branch || repoInfo.default_branch || "main");
    const tree = await githubJson<GitHubTree>(
      token,
      `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    );
    const existingSkillCount = (await listSkillsForOwner({ ownerId: user.id })).length;
    const skillPaths = tree.tree
      .filter((entry) => entry.type === "blob" && entry.path.split("/").pop()?.toLowerCase() === "skill.md")
      .map((entry) => entry.path);
    const imported = [];

    for (const skillPath of skillPaths) {
      const contentResponse = await githubJson<{ content?: string; encoding?: string }>(
        token,
        `/repos/${owner}/${repo}/contents/${skillPath.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`,
      );
      const markdown = Buffer.from(contentResponse.content || "", contentResponse.encoding === "base64" ? "base64" : "utf8").toString("utf8");
      const folder = skillPath.split("/").slice(0, -1).join("/") || skillSlug(parseSkillName(markdown, "imported-skill"));
      const name = parseSkillName(markdown, folder.split("/").pop() || "imported-skill");
      const created = await createSkillDraft({
        ownerId: user.id,
        name,
        description: `Imported from ${repoFullName}`,
        baseUrl: new URL(request.url).origin,
        skillIdGenerator: randomSkillId,
        sourceMode: "github_import",
        originalRepoFullName: repoFullName,
        originalSkillPath: folder,
      });
      await updateSkillFileText({
        ownerId: user.id,
        fileId: created.file.id,
        contentText: markdown,
        path: "SKILL.md",
      });
      const targets = await listPublishingTargets({ ownerId: user.id, skillId: created.skill.skillId });
      const githubTarget = targets.find((target) => target.targetKind === "github");
      if (githubTarget) {
        await defaultSkillStore.transact([
          defaultSkillStore.update("publishingTargets", githubTarget.id, {
            repoFullName,
            installationId,
            skillRoot: folder,
            baseBranch: branch,
            autoMerge: false,
            consentStatus: "pending",
            updatedAt: Date.now(),
          }),
        ]);
      }
      imported.push({
        skill_id: created.skill.skillId,
        name,
        path: folder,
        consent_status: "pending",
      });
    }

    await captureServerEvent({
      distinctId: user.id,
      event: "skills_imported",
      properties: {
        repo_full_name: repoFullName,
        installation_id: installationId,
        base_branch: branch,
        imported_count: imported.length,
        is_first_skill_import: existingSkillCount === 0 && imported.length > 0,
      },
    });
    if (existingSkillCount === 0 && imported.length > 0) {
      await captureServerEvent({
        distinctId: user.id,
        event: "first_skill_imported",
        properties: {
          repo_full_name: repoFullName,
          imported_count: imported.length,
        },
      });
    }

    return jsonResponse({ imported }, 201, "POST, OPTIONS");
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown import error" }, 400, "POST, OPTIONS");
  }
}
