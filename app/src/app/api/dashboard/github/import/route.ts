import crypto from "node:crypto";
import { NextRequest } from "next/server";

import { adminDb } from "@/lib/adminDb";
import { getDashboardUser } from "@/lib/dashboard-auth";
import {
  MAX_GITHUB_IMPORT_FILE_BYTES,
  MAX_GITHUB_IMPORT_SKILL_BYTES,
  discoverGitHubSkillCandidates,
  type ExistingGitHubImport,
  type GitHubSkillCandidate,
  type GitHubTreeEntry,
} from "@/lib/github-import";
import { importGitHubSkillCandidate, type GitHubSkillImportFile } from "@/lib/github-import-service";
import { captureServerEvent } from "@/lib/posthog-server";
import { createGitHubAppInstallationToken } from "@/lib/publishing/adapters/github-app";
import { jsonResponse } from "@/lib/route-helpers";
import { defaultSkillStore, listSkillsForOwner } from "@/lib/skills/repository";

type GitHubRepositoryResponse = {
  id: number;
  full_name: string;
  default_branch?: string;
};

type GitHubRepositoriesResponse = {
  repositories?: GitHubRepositoryResponse[];
};

type GitHubTreeResponse = {
  tree?: GitHubTreeEntry[];
  truncated?: boolean;
};

const MAX_GITHUB_INSTALLATION_REPOSITORY_PAGES = 50;
const MAX_IMPORT_ERROR_MESSAGE_LENGTH = 240;

type ImportSessionRow = {
  id: string;
  ownerId: string;
  sessionId: string;
  installationId: string;
  status?: string;
  accountLogin?: string;
  accountType?: string;
  candidatesJson?: unknown;
  warningsJson?: unknown;
  repositoriesChecked?: number;
};

function randomSkillId() {
  const chars = "abcdefghijkmnopqrstuvwxyz23456789";
  let out = "sk_";
  for (let index = 0; index < 10; index += 1) {
    out += chars[crypto.randomInt(0, chars.length)];
  }
  return out;
}

function encodeGitHubPath(value: string) {
  return value.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function splitRepoFullName(repoFullName: string) {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    throw new Error(`invalid GitHub repo: ${repoFullName}`);
  }
  return { owner, repo };
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

async function githubRawFile(token: string, repoFullName: string, path: string, ref: string) {
  const { owner, repo } = splitRepoFullName(repoFullName);
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(ref)}`,
    {
      headers: {
        accept: "application/vnd.github.raw",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
      },
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub file request failed ${response.status}: ${await response.text()}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function getImportSession(ownerId: string, sessionId: string) {
  const rows = await defaultSkillStore.query({
    skillImports: {
      $: {
        where: {
          ownerId,
          sessionId,
        },
      },
    },
  });
  const session = rows.skillImports?.[0];
  return session ? (session as ImportSessionRow) : null;
}

async function updateImportSession(session: ImportSessionRow, values: Record<string, unknown>) {
  await defaultSkillStore.transact([
    defaultSkillStore.update("skillImports", session.id, {
      ...values,
      updatedAt: Date.now(),
    }),
  ]);
}

function truncateMessage(message: string, maxLength = MAX_IMPORT_ERROR_MESSAGE_LENGTH) {
  return message.length > maxLength ? `${message.slice(0, maxLength - 1)}…` : message;
}

function joinedFailureMessage(failures: Array<{ error: string }>) {
  return failures.map((failure) => truncateMessage(failure.error)).join(" | ");
}

export async function listInstallationRepositories(token: string) {
  const repositories: GitHubRepositoryResponse[] = [];
  const warnings: string[] = [];
  for (let page = 1; page <= MAX_GITHUB_INSTALLATION_REPOSITORY_PAGES; page += 1) {
    const payload = await githubJson<GitHubRepositoriesResponse>(
      token,
      `/installation/repositories?per_page=100&page=${page}`,
    );
    const pageRepositories = payload.repositories ?? [];
    repositories.push(...pageRepositories);
    if (pageRepositories.length < 100) {
      break;
    }
    if (page === MAX_GITHUB_INSTALLATION_REPOSITORY_PAGES) {
      warnings.push(
        `GitHub repository listing stopped after ${MAX_GITHUB_INSTALLATION_REPOSITORY_PAGES} pages. Change repository access or contact support if expected repositories are missing.`,
      );
    }
  }
  return { repositories, warnings };
}

async function upsertGitHubRepository({
  ownerId,
  installationId,
  repository,
}: {
  ownerId: string;
  installationId: string;
  repository: GitHubRepositoryResponse;
}): Promise<string | null> {
  const repositoryId = String(repository.id);
  const rows = await defaultSkillStore.query({
    githubRepositories: {
      $: {
        where: {
          repositoryId,
        },
      },
    },
  });
  const existing = rows.githubRepositories?.[0];
  if (existing?.ownerId && existing.ownerId !== ownerId) {
    return `${repository.full_name}: already connected to another Skillfully account`;
  }

  const values = {
    ownerId,
    installationId,
    repositoryId,
    repoFullName: repository.full_name,
    defaultBranch: repository.default_branch || "main",
    selected: true,
    updatedAt: Date.now(),
  };
  await defaultSkillStore.transact([
    existing
      ? defaultSkillStore.update("githubRepositories", String(existing.id), values)
      : defaultSkillStore.create("githubRepositories", crypto.randomUUID(), {
          ...values,
          createdAt: Date.now(),
        }),
  ]);
  return null;
}

async function getExistingGitHubImports(ownerId: string): Promise<ExistingGitHubImport[]> {
  const skills = await listSkillsForOwner({ ownerId });
  return skills
    .filter((skill) => skill.sourceMode === "github_import")
    .map((skill) => ({
      repositoryId: skill.originalRepositoryId,
      skillRoot: skill.originalSkillPath,
      skillId: skill.skillId,
    }));
}

function isCachedCandidate(value: unknown): value is GitHubSkillCandidate {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<GitHubSkillCandidate>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.repositoryId === "string" &&
    typeof candidate.repoFullName === "string" &&
    typeof candidate.branch === "string" &&
    typeof candidate.skillRoot === "string" &&
    typeof candidate.skillName === "string" &&
    (candidate.status === "valid" || candidate.status === "invalid" || candidate.status === "already_imported") &&
    Array.isArray(candidate.files) &&
    Array.isArray(candidate.oversizedFiles) &&
    typeof candidate.totalSize === "number" &&
    typeof candidate.totalSizeExceedsLimit === "boolean"
  );
}

export function cachedDiscoveryForSession(session: ImportSessionRow) {
  if (session.status !== "discovered" && session.status !== "imported") {
    return null;
  }
  if (!Array.isArray(session.candidatesJson)) {
    return null;
  }
  const candidates = session.candidatesJson.filter(isCachedCandidate);
  if (candidates.length !== session.candidatesJson.length) {
    return null;
  }
  const warnings = Array.isArray(session.warningsJson)
    ? session.warningsJson.filter((warning): warning is string => typeof warning === "string")
    : [];
  return {
    candidates,
    warnings,
    repositoriesChecked: Number(session.repositoriesChecked ?? 0),
  };
}

async function discoverCandidatesForSession({
  ownerId,
  token,
  session,
  refresh = false,
}: {
  ownerId: string;
  token: string;
  session: ImportSessionRow;
  refresh?: boolean;
}) {
  if (!refresh) {
    const cached = cachedDiscoveryForSession(session);
    if (cached) {
      return cached;
    }
  }

  const { repositories, warnings: repositoryWarnings } = await listInstallationRepositories(token);
  const existingImports = await getExistingGitHubImports(ownerId);
  const candidates: GitHubSkillCandidate[] = [];
  const warnings: string[] = [...repositoryWarnings];

  for (const repository of repositories) {
    const repositoryWarning = await upsertGitHubRepository({ ownerId, installationId: session.installationId, repository });
    if (repositoryWarning) {
      warnings.push(repositoryWarning);
    }
    const repoFullName = repository.full_name;
    const defaultBranch = repository.default_branch || "main";
    const { owner, repo } = splitRepoFullName(repoFullName);

    let tree: GitHubTreeResponse;
    try {
      tree = await githubJson<GitHubTreeResponse>(
        token,
        `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
      );
    } catch (error) {
      warnings.push(`${repoFullName}: ${error instanceof Error ? error.message : "could not read repository"}`);
      continue;
    }

    if (tree.truncated) {
      warnings.push(`${repoFullName}: repository tree is too large to check completely`);
    }

    const entries = tree.tree ?? [];
    const skillEntries = entries.filter(
      (entry) =>
        entry.type === "blob" &&
        entry.path.split("/").includes("skills") &&
        entry.path.split("/").at(-1) === "SKILL.md",
    );
    const skillMarkdownByPath: Record<string, string> = {};
    for (const entry of skillEntries) {
      try {
        skillMarkdownByPath[entry.path] = (await githubRawFile(token, repoFullName, entry.path, defaultBranch)).toString("utf8");
      } catch (error) {
        warnings.push(`${repoFullName}/${entry.path}: ${error instanceof Error ? error.message : "could not read SKILL.md"}`);
      }
    }

    candidates.push(
      ...discoverGitHubSkillCandidates({
        repository: {
          repositoryId: String(repository.id),
          repoFullName,
          defaultBranch,
        },
        tree: entries,
        skillMarkdownByPath,
        existingImports,
      }),
    );
  }

  await updateImportSession(session, {
    status: "discovered",
    discoveredCount: candidates.filter((candidate) => candidate.status === "valid").length,
    repositoriesChecked: repositories.length,
    candidatesJson: candidates,
    warningsJson: warnings,
  });

  return { candidates, warnings, repositoriesChecked: repositories.length };
}

function importableFiles(candidate: GitHubSkillCandidate) {
  const files: typeof candidate.files = [];
  let totalSize = 0;
  for (const file of candidate.files) {
    if (file.size > MAX_GITHUB_IMPORT_FILE_BYTES) {
      continue;
    }
    if (totalSize + file.size > MAX_GITHUB_IMPORT_SKILL_BYTES) {
      continue;
    }
    files.push(file);
    totalSize += file.size;
  }
  return files;
}

export async function OPTIONS() {
  return jsonResponse({}, 200, "GET, POST, OPTIONS");
}

export async function GET(request: NextRequest) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "GET, POST, OPTIONS");
  }

  const sessionId = request.nextUrl.searchParams.get("session_id") || "";
  if (!sessionId) {
    return jsonResponse({ error: "session_id is required" }, 400, "GET, POST, OPTIONS");
  }

  const session = await getImportSession(user.id, sessionId);
  if (!session) {
    return jsonResponse({ error: "GitHub import session not found" }, 404, "GET, POST, OPTIONS");
  }

  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
    return jsonResponse({ error: "GitHub App credentials are not configured" }, 400, "GET, POST, OPTIONS");
  }

  try {
    const token = await createGitHubAppInstallationToken({
      fetcher: fetch,
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
      installationId: session.installationId,
    });
    const { candidates, warnings, repositoriesChecked } = await discoverCandidatesForSession({
      ownerId: user.id,
      token,
      session,
      refresh: request.nextUrl.searchParams.get("refresh") === "1",
    });

    return jsonResponse({
      session: {
        session_id: session.sessionId,
        status: "discovered",
        account_login: session.accountLogin ?? null,
      },
      repositories_checked: repositoriesChecked,
      candidates,
      warnings,
    }, 200, "GET, POST, OPTIONS");
  } catch (error) {
    await updateImportSession(session, {
      status: "failed",
      error: error instanceof Error ? error.message : "unknown GitHub import error",
    });
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown GitHub import error" }, 400, "GET, POST, OPTIONS");
  }
}

export async function POST(request: NextRequest) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "GET, POST, OPTIONS");
  }

  let body: { session_id?: unknown; candidate_ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400, "GET, POST, OPTIONS");
  }

  const sessionId = String(body.session_id ?? "").trim();
  const selectedIds = Array.isArray(body.candidate_ids) ? body.candidate_ids.map(String) : [];
  if (!sessionId) {
    return jsonResponse({ error: "session_id is required" }, 400, "GET, POST, OPTIONS");
  }
  if (selectedIds.length === 0) {
    return jsonResponse({ error: "select at least one skill to import" }, 400, "GET, POST, OPTIONS");
  }

  const session = await getImportSession(user.id, sessionId);
  if (!session) {
    return jsonResponse({ error: "GitHub import session not found" }, 404, "GET, POST, OPTIONS");
  }

  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
    return jsonResponse({ error: "GitHub App credentials are not configured" }, 400, "GET, POST, OPTIONS");
  }

  try {
    const token = await createGitHubAppInstallationToken({
      fetcher: fetch,
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
      installationId: session.installationId,
    });
    const { candidates } = await discoverCandidatesForSession({
      ownerId: user.id,
      token,
      session,
    });
    const selectedCandidates = candidates.filter(
      (candidate) => selectedIds.includes(candidate.id) && candidate.status === "valid",
    );
    if (selectedCandidates.length === 0) {
      return jsonResponse({ error: "no selected skills can be imported" }, 400, "GET, POST, OPTIONS");
    }

    const existingSkillCount = (await listSkillsForOwner({ ownerId: user.id })).length;
    const imported = [];
    const failures = [];

    for (const candidate of selectedCandidates) {
      try {
        const filesToImport = importableFiles(candidate);
        const files: GitHubSkillImportFile[] = [];
        for (const file of filesToImport) {
          files.push({
            relativePath: file.relativePath,
            content: await githubRawFile(token, candidate.repoFullName, file.path, candidate.branch),
          });
        }
        const created = await importGitHubSkillCandidate({
          ownerId: user.id,
          baseUrl: new URL(request.url).origin,
          installationId: session.installationId,
          repository: {
            repositoryId: candidate.repositoryId,
            repoFullName: candidate.repoFullName,
            defaultBranch: candidate.branch,
          },
          candidate: {
            skillRoot: candidate.skillRoot,
            skillName: candidate.skillName,
            description: candidate.description,
          },
          files,
          skillIdGenerator: randomSkillId,
          store: defaultSkillStore,
          uploadAssetFile: async (file) => {
            const storagePath = `skills/${user.id}/github-imports/${crypto.randomUUID()}/${file.relativePath}`;
            const uploaded = await adminDb.storage.uploadFile(storagePath, file.content, {
              contentType: file.mimeType || "application/octet-stream",
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
            return {
              storageFileId: uploaded.data.id,
              storageUrl: fileRows.$files?.[0]?.url,
              mimeType: file.mimeType,
            };
          },
        });
        imported.push({
          skill_id: created.skill.skillId,
          entity_id: created.skill.id,
          name: created.skill.name,
          repo_full_name: candidate.repoFullName,
          repository_id: candidate.repositoryId,
          skill_root: candidate.skillRoot,
          skipped_files: candidate.files.length - filesToImport.length,
        });
      } catch (error) {
        failures.push({
          candidate_id: candidate.id,
          name: candidate.skillName,
          error: truncateMessage(error instanceof Error ? error.message : "unknown import error"),
        });
      }
    }

    await updateImportSession(session, {
      status: imported.length > 0 ? "imported" : "failed",
      importedCount: imported.length,
      ...(failures.length > 0 ? { error: joinedFailureMessage(failures) } : {}),
      ...(imported.length > 0 ? { completedAt: Date.now() } : {}),
    });

    await captureServerEvent({
      distinctId: user.id,
      event: "skills_imported",
      properties: {
        installation_id: session.installationId,
        imported_count: imported.length,
        failure_count: failures.length,
        is_first_skill_import: existingSkillCount === 0 && imported.length > 0,
      },
    });
    if (existingSkillCount === 0 && imported.length > 0) {
      await captureServerEvent({
        distinctId: user.id,
        event: "first_skill_imported",
        properties: {
          installation_id: session.installationId,
          imported_count: imported.length,
        },
      });
    }

    const status = imported.length > 0 ? 201 : 400;
    return jsonResponse({
      imported,
      failures,
      ...(imported.length === 0
        ? { error: joinedFailureMessage(failures) || "No skills were imported." }
        : {}),
    }, status, "GET, POST, OPTIONS");
  } catch (error) {
    await updateImportSession(session, {
      status: "failed",
      error: error instanceof Error ? error.message : "unknown GitHub import error",
    });
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown GitHub import error" }, 400, "GET, POST, OPTIONS");
  }
}
