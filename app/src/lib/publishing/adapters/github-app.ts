import crypto from "node:crypto";

import { normalizeSkillFilePath } from "@/lib/skills/skill-files";
import type { PublishAdapter, PublishContext, PublishFile } from "../types";

export type GitHubPublishTarget = {
  repoFullName: string;
  installationId: string;
  skillRoot: string;
  baseBranch: string;
  autoMerge: boolean;
};

export type GitHubWriteFile = {
  path: string;
  contentText?: string | null;
  contentBase64?: string | null;
  storageUrl?: string | null;
};

export type GitHubWritePlan = {
  repoFullName: string;
  baseBranch: string;
  branchName: string;
  files: GitHubWriteFile[];
  commitMessage: string;
  pullRequestTitle: string;
  pullRequestBody: string;
};

type GitHubFetch = typeof fetch;

export function resolveGitHubPublishTarget({
  defaultRepo,
  skill,
  configuredTarget,
}: {
  defaultRepo: { repoFullName: string; installationId: string; baseBranch?: string | null };
  skill: {
    skillId: string;
    slug: string;
    sourceMode?: string | null;
    originalSkillPath?: string | null;
  };
  configuredTarget: {
    repoFullName: string;
    installationId: string;
    skillRoot?: string | null;
    baseBranch?: string | null;
    autoMerge?: boolean | null;
  } | null;
}): GitHubPublishTarget {
  if (skill.sourceMode === "github_import" && configuredTarget) {
    return {
      repoFullName: configuredTarget.repoFullName,
      installationId: configuredTarget.installationId,
      skillRoot: normalizeSkillRoot(configuredTarget.skillRoot || skill.originalSkillPath || `skills/${skill.slug}`),
      baseBranch: configuredTarget.baseBranch || "main",
      autoMerge: Boolean(configuredTarget.autoMerge),
    };
  }

  return {
    repoFullName: defaultRepo.repoFullName,
    installationId: defaultRepo.installationId,
    skillRoot: `skills/${skill.slug}`,
    baseBranch: defaultRepo.baseBranch || "main",
    autoMerge: true,
  };
}

function normalizeSkillRoot(value: string) {
  return normalizeSkillFilePath(value).replace(/\/+$/, "");
}

function safeBranchSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "skill";
}

export function buildGitHubWritePlan({
  repoFullName,
  skillRoot,
  baseBranch,
  skillSlug,
  version,
  files,
}: {
  repoFullName: string;
  skillRoot: string;
  baseBranch: string;
  skillSlug: string;
  version: string;
  files: PublishFile[];
}): GitHubWritePlan {
  const timestamp = Date.now().toString(36);
  const normalizedRoot = normalizeSkillRoot(skillRoot);
  const normalizedVersion = safeBranchSegment(version);

  return {
    repoFullName,
    baseBranch,
    branchName: `skillfully/${safeBranchSegment(skillSlug)}/${normalizedVersion}-${timestamp}`,
    files: files.map((file) => ({
      ...file,
      path: `${normalizedRoot}/${normalizeSkillFilePath(file.path)}`,
    })),
    commitMessage: `Publish ${skillSlug} v${version}`,
    pullRequestTitle: `Publish ${skillSlug} v${version}`,
    pullRequestBody: [
      "Published from Skillfully.",
      "",
      `Skill: ${skillSlug}`,
      `Version: ${version}`,
    ].join("\n"),
  };
}

export function createGitHubAppJwt({
  appId,
  privateKey,
  now = Math.floor(Date.now() / 1000),
}: {
  appId: string;
  privateKey: string;
  now?: number;
}) {
  const encodedHeader = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedPayload = base64Url(
    JSON.stringify({
      iat: now - 60,
      exp: now + 9 * 60,
      iss: appId,
    }),
  );
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), normalizePrivateKey(privateKey));
  return `${unsigned}.${base64Url(signature)}`;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function normalizePrivateKey(value: string) {
  return value.includes("\\n") ? value.replaceAll("\\n", "\n") : value;
}

async function githubJson<T>({
  fetcher,
  token,
  path,
  method = "GET",
  body,
}: {
  fetcher: GitHubFetch;
  token: string;
  path: string;
  method?: string;
  body?: unknown;
}): Promise<T> {
  const response = await fetcher(`https://api.github.com${path}`, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub request failed ${response.status}: ${detail}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function createGitHubAppInstallationToken({
  fetcher,
  appId,
  privateKey,
  installationId,
}: {
  fetcher: GitHubFetch;
  appId: string;
  privateKey: string;
  installationId: string;
}) {
  const jwt = createGitHubAppJwt({ appId, privateKey });
  const response = await fetcher(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${jwt}`,
      "x-github-api-version": "2022-11-28",
    },
  } as never);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Unable to create GitHub installation token ${response.status}: ${detail}`);
  }

  const payload = (await response.json()) as { token?: string };
  if (!payload.token) {
    throw new Error("GitHub installation token response did not include a token");
  }
  return payload.token;
}

function encodeGitHubPath(value: string) {
  return value.split("/").map((part) => encodeURIComponent(part)).join("/");
}

async function fileContentBase64(file: GitHubWriteFile, fetcher: GitHubFetch) {
  if (file.contentBase64) {
    return file.contentBase64;
  }
  if (file.contentText !== undefined && file.contentText !== null) {
    return Buffer.from(file.contentText).toString("base64");
  }
  if (file.storageUrl) {
    const response = await fetcher(file.storageUrl);
    if (!response.ok) {
      throw new Error(`Unable to fetch storage asset ${file.path}: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer()).toString("base64");
  }
  return Buffer.from("").toString("base64");
}

async function pushPlanToGitHub({
  fetcher,
  token,
  plan,
  autoMerge,
}: {
  fetcher: GitHubFetch;
  token: string;
  plan: GitHubWritePlan;
  autoMerge: boolean;
}) {
  const [owner, repo] = plan.repoFullName.split("/");
  if (!owner || !repo) {
    throw new Error(`invalid GitHub repo: ${plan.repoFullName}`);
  }

  const baseRef = await githubJson<{ object: { sha: string } }>({
    fetcher,
    token,
    path: `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(plan.baseBranch)}`,
  });

  await githubJson({
    fetcher,
    token,
    path: `/repos/${owner}/${repo}/git/refs`,
    method: "POST",
    body: {
      ref: `refs/heads/${plan.branchName}`,
      sha: baseRef.object.sha,
    },
  });

  for (const file of plan.files) {
    let existingSha: string | undefined;
    try {
      const existing = await githubJson<{ sha?: string }>({
        fetcher,
        token,
        path: `/repos/${owner}/${repo}/contents/${encodeGitHubPath(file.path)}?ref=${encodeURIComponent(plan.branchName)}`,
      });
      existingSha = existing.sha;
    } catch {
      existingSha = undefined;
    }

    await githubJson({
      fetcher,
      token,
      path: `/repos/${owner}/${repo}/contents/${encodeGitHubPath(file.path)}`,
      method: "PUT",
      body: {
        message: plan.commitMessage,
        content: await fileContentBase64(file, fetcher),
        branch: plan.branchName,
        ...(existingSha ? { sha: existingSha } : {}),
      },
    });
  }

  const pullRequest = await githubJson<{ number: number; html_url: string }>({
    fetcher,
    token,
    path: `/repos/${owner}/${repo}/pulls`,
    method: "POST",
    body: {
      title: plan.pullRequestTitle,
      body: plan.pullRequestBody,
      head: plan.branchName,
      base: plan.baseBranch,
    },
  });

  if (autoMerge) {
    await githubJson({
      fetcher,
      token,
      path: `/repos/${owner}/${repo}/pulls/${pullRequest.number}/merge`,
      method: "PUT",
      body: {
        commit_title: plan.pullRequestTitle,
        merge_method: "squash",
      },
    });
  }

  return pullRequest.html_url;
}

export function createGitHubAppAdapter({
  appId = process.env.GITHUB_APP_ID,
  privateKey = process.env.GITHUB_APP_PRIVATE_KEY,
  defaultRepo = {
    repoFullName: process.env.SKILLFULLY_DEFAULT_SKILLS_REPO || "erensunerr/skillfully-skills",
    installationId: process.env.SKILLFULLY_DEFAULT_GITHUB_INSTALLATION_ID || "",
    baseBranch: process.env.SKILLFULLY_DEFAULT_SKILLS_REPO_BRANCH || "main",
  },
  fetcher = fetch,
}: {
  appId?: string;
  privateKey?: string;
  defaultRepo?: { repoFullName: string; installationId: string; baseBranch?: string | null };
  fetcher?: GitHubFetch;
} = {}): PublishAdapter {
  return {
    kind: "github",
    async validate(context: PublishContext) {
      const issues = [];
      if (!appId || !privateKey) {
        issues.push({ severity: "error" as const, message: "GitHub App credentials are not configured" });
      }
      if (!defaultRepo.installationId && !context.githubTarget?.installationId) {
        issues.push({ severity: "error" as const, message: "GitHub App installation is not configured" });
      }
      return issues;
    },
    async submit(context: PublishContext) {
      if (!appId || !privateKey) {
        throw new Error("GitHub App credentials are not configured");
      }

      const target = resolveGitHubPublishTarget({
        defaultRepo,
        skill: context.skill,
        configuredTarget: context.githubTarget ?? null,
      });
      const token = await createGitHubAppInstallationToken({
        fetcher,
        appId,
        privateKey,
        installationId: target.installationId,
      });
      const plan = buildGitHubWritePlan({
        repoFullName: target.repoFullName,
        skillRoot: target.skillRoot,
        baseBranch: target.baseBranch,
        skillSlug: context.skill.slug,
        version: context.version.version,
        files: context.files,
      });
      const url = await pushPlanToGitHub({
        fetcher,
        token,
        plan,
        autoMerge: target.autoMerge,
      });

      return {
        targetKind: "github",
        status: target.autoMerge ? "published" : "submitted",
        url,
        details: {
          repoFullName: target.repoFullName,
          branchName: plan.branchName,
          autoMerge: target.autoMerge,
        },
      };
    },
  };
}
