import crypto from "node:crypto";
import matter from "gray-matter";

import {
  type SkillMarkdownValidation,
  validateSkillMarkdown as validateAgentSkillMarkdown,
} from "@/lib/skills/skill-frontmatter";

export const MAX_GITHUB_IMPORT_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_GITHUB_IMPORT_SKILL_BYTES = 1024 * 1024 * 1024;

export type GitHubImportRepository = {
  repositoryId: string;
  repoFullName: string;
  defaultBranch: string;
};

export type GitHubTreeEntry = {
  path: string;
  type: string;
  size?: number;
};

export type ExistingGitHubImport = {
  repositoryId?: string | null;
  skillRoot?: string | null;
  skillId?: string | null;
};

export type GitHubSkillCandidateStatus = "valid" | "invalid" | "already_imported";

export type GitHubSkillCandidateFile = {
  path: string;
  relativePath: string;
  size: number;
};

export type GitHubSkillCandidate = {
  id: string;
  repositoryId: string;
  repoFullName: string;
  branch: string;
  skillRoot: string;
  skillName: string;
  description?: string;
  status: GitHubSkillCandidateStatus;
  reason?: string;
  existingSkillId?: string;
  files: GitHubSkillCandidateFile[];
  oversizedFiles: GitHubSkillCandidateFile[];
  totalSize: number;
  totalSizeExceedsLimit: boolean;
};

export type GitHubSkillCandidateImportSuccess = {
  candidate_id?: string;
  skill_id?: string;
};

export type GitHubSkillCandidateImportFailure = {
  candidate_id?: string;
  name?: string;
  error: string;
};

export const EXISTING_GITHUB_IMPORTS_UNAVAILABLE_REASON =
  "Could not verify existing GitHub imports. Refresh GitHub import and try again.";

type GitHubImportSessionStore = {
  create(entity: "skillImports", id: string, values: Record<string, unknown>): unknown;
  transact(ops: unknown[]): Promise<void>;
};

export type GitHubImportSession = {
  id: string;
  ownerId: string;
  sessionId: string;
  installationId: string;
  accountLogin: string;
  accountType: string;
  status: string;
  discoveredCount: number;
  importedCount: number;
  createdAt: number;
  updatedAt: number;
};

export type ExistingGitHubInstallationRow = {
  ownerId?: unknown;
  installationId?: unknown;
  accountLogin?: unknown;
  accountType?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type ExistingGitHubInstallation = {
  installationId: string;
  accountLogin: string;
  accountType: string;
};

function randomSessionId() {
  const chars = "abcdefghijkmnopqrstuvwxyz23456789";
  let out = "gis_";
  for (let index = 0; index < 24; index += 1) {
    out += chars[crypto.randomInt(0, chars.length)];
  }
  return out;
}

function numericTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function selectExistingGitHubInstallation(
  rows: ExistingGitHubInstallationRow[],
  ownerId: string,
): ExistingGitHubInstallation | null {
  // A user can reconnect/update the GitHub App over time; choose the freshest
  // owner-bound installation and ignore webhook-created rows that are still
  // unclaimed.
  const [installation] = rows
    .filter((row) =>
      row.ownerId === ownerId &&
      typeof row.installationId === "string" &&
      row.installationId.length > 0 &&
      typeof row.accountLogin === "string" &&
      row.accountLogin.length > 0,
    )
    .sort((left, right) =>
      (numericTimestamp(right.updatedAt) || numericTimestamp(right.createdAt)) -
      (numericTimestamp(left.updatedAt) || numericTimestamp(left.createdAt)),
    );

  if (!installation || typeof installation.installationId !== "string" || typeof installation.accountLogin !== "string") {
    return null;
  }

  return {
    installationId: installation.installationId,
    accountLogin: installation.accountLogin,
    accountType: typeof installation.accountType === "string" && installation.accountType
      ? installation.accountType
      : "User",
  };
}

export async function createGitHubImportSession({
  store,
  now = () => Date.now(),
  idGenerator = () => crypto.randomUUID(),
  sessionIdGenerator = randomSessionId,
  ownerId,
  installationId,
  accountLogin,
  accountType,
}: {
  store: GitHubImportSessionStore;
  now?: () => number;
  idGenerator?: () => string;
  sessionIdGenerator?: () => string;
  ownerId: string;
  installationId: string;
  accountLogin: string;
  accountType: string;
}) {
  const currentTime = now();
  const session: GitHubImportSession = {
    id: idGenerator(),
    ownerId,
    sessionId: sessionIdGenerator(),
    installationId,
    accountLogin,
    accountType,
    status: "connected",
    discoveredCount: 0,
    importedCount: 0,
    createdAt: currentTime,
    updatedAt: currentTime,
  };
  const { id, ...values } = session;
  await store.transact([store.create("skillImports", id, values)]);
  return session;
}

export function validateSkillMarkdown({
  markdown,
  parentDirectoryName,
}: {
  markdown: string;
  parentDirectoryName: string;
}): SkillMarkdownValidation {
  if (markdown.match(/^---\r?\n/)) {
    try {
      matter(markdown);
    } catch (error) {
      return {
        valid: false,
        reason: `SKILL.md frontmatter is not valid YAML: ${
          error instanceof Error ? error.message : "invalid YAML"
        }`,
      };
    }
  }

  return validateAgentSkillMarkdown({ markdown, expectedName: parentDirectoryName });
}

function pathSegments(path: string) {
  return path.split("/").filter(Boolean);
}

function isSkillMarkdownCandidate(path: string) {
  const segments = pathSegments(path);
  return segments.at(-1) === "SKILL.md" && segments.includes("skills") && segments.length >= 3;
}

function parentDirectoryName(path: string) {
  return pathSegments(path).at(-2) ?? "";
}

function skillRootForSkillMarkdown(path: string) {
  return pathSegments(path).slice(0, -1).join("/");
}

export function relativeSkillFilePath(skillRoot: string, filePath: string) {
  if (filePath === `${skillRoot}/SKILL.md`) {
    return "SKILL.md";
  }
  const prefix = `${skillRoot}/`;
  if (!filePath.startsWith(prefix)) {
    throw new Error("file is not inside skill root");
  }
  return filePath.slice(prefix.length);
}

function candidateId(repositoryId: string, skillRoot: string) {
  return Buffer.from(`${repositoryId}:${skillRoot}`).toString("base64url");
}

function existingImportFor({
  existingImports,
  repositoryId,
  skillRoot,
}: {
  existingImports: ExistingGitHubImport[];
  repositoryId: string;
  skillRoot: string;
}) {
  return existingImports.find(
    (existing) => existing.repositoryId === repositoryId && existing.skillRoot === skillRoot,
  );
}

function compareSkillFiles(a: GitHubSkillCandidateFile, b: GitHubSkillCandidateFile) {
  if (a.relativePath === "SKILL.md") {
    return -1;
  }
  if (b.relativePath === "SKILL.md") {
    return 1;
  }
  return a.relativePath.localeCompare(b.relativePath);
}

function importFailureForCandidate(
  candidate: GitHubSkillCandidate,
  failures: GitHubSkillCandidateImportFailure[],
) {
  return failures.find((failure) => failure.candidate_id === candidate.id);
}

function importSuccessForCandidate(
  candidate: GitHubSkillCandidate,
  imported: GitHubSkillCandidateImportSuccess[],
) {
  return imported.find((success) => success.candidate_id === candidate.id);
}

type ValidationFailureMatch = {
  scope: string | null;
  skillName: string;
  reason: string;
};

function validationFailureFromWarning(value: string): ValidationFailureMatch | null {
  const match = value.match(/^(?:(.*?):\s*)?Validation failed for ([^:\s]+):\s*(.+)$/);
  if (!match) {
    return null;
  }

  return {
    scope: match[1] ?? null,
    skillName: match[2],
    reason: `Validation failed for ${match[2]}: ${match[3]}`,
  };
}

function skillNameCounts(candidates: GitHubSkillCandidate[]) {
  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    counts.set(candidate.skillName, (counts.get(candidate.skillName) ?? 0) + 1);
  }
  return counts;
}

function validationFailureMatchesCandidate({
  candidate,
  failure,
  counts,
}: {
  candidate: GitHubSkillCandidate;
  failure: ValidationFailureMatch;
  counts: Map<string, number>;
}) {
  if (failure.skillName !== candidate.skillName) {
    return false;
  }
  if (failure.scope?.includes(candidate.repoFullName)) {
    return true;
  }
  return (counts.get(failure.skillName) ?? 0) === 1;
}

export function markGitHubSkillCandidateDiscoveryFailures({
  candidates,
  errors,
}: {
  candidates: GitHubSkillCandidate[];
  errors: string[];
}) {
  const parsedFailures: ValidationFailureMatch[] = [];
  for (const error of errors) {
    const failure = validationFailureFromWarning(error);
    if (failure) {
      parsedFailures.push(failure);
    }
  }

  if (parsedFailures.length === 0) {
    return candidates;
  }

  const counts = skillNameCounts(candidates);
  return candidates.map((candidate): GitHubSkillCandidate => {
    const failure = parsedFailures.find((parsedFailure) =>
      validationFailureMatchesCandidate({ candidate, failure: parsedFailure, counts }),
    );
    if (!failure) {
      return candidate;
    }

    return {
      ...candidate,
      status: "invalid",
      reason: failure.reason,
    };
  });
}

export function filterGitHubSkillCandidateDiscoveryWarnings({
  candidates,
  warnings,
}: {
  candidates: GitHubSkillCandidate[];
  warnings: string[];
}) {
  const counts = skillNameCounts(candidates);

  return warnings.filter((warning) => {
    const failure = validationFailureFromWarning(warning);
    if (!failure) {
      return true;
    }

    return !candidates.some(
      (candidate) =>
        candidate.status === "invalid" &&
        candidate.reason === failure.reason &&
        validationFailureMatchesCandidate({ candidate, failure, counts }),
    );
  });
}

export function markGitHubSkillCandidatesExistingImportCheckFailed(
  candidates: GitHubSkillCandidate[],
) {
  return candidates.map((candidate): GitHubSkillCandidate => {
    if (candidate.status !== "valid") {
      return candidate;
    }

    return {
      ...candidate,
      status: "invalid",
      reason: EXISTING_GITHUB_IMPORTS_UNAVAILABLE_REASON,
    };
  });
}

export function markGitHubSkillCandidateImportResults({
  candidates,
  imported,
  failures,
}: {
  candidates: GitHubSkillCandidate[];
  imported: GitHubSkillCandidateImportSuccess[];
  failures: GitHubSkillCandidateImportFailure[];
}) {
  return candidates.map((candidate): GitHubSkillCandidate => {
    const failure = importFailureForCandidate(candidate, failures);
    if (failure) {
      return {
        ...candidate,
        status: "invalid",
        reason: failure.error,
      };
    }

    const success = importSuccessForCandidate(candidate, imported);
    if (success) {
      return {
        ...candidate,
        status: "already_imported",
        ...(success.skill_id ? { existingSkillId: success.skill_id } : {}),
      };
    }

    return candidate;
  });
}

export function discoverGitHubSkillCandidates({
  repository,
  tree,
  skillMarkdownByPath,
  existingImports,
}: {
  repository: GitHubImportRepository;
  tree: GitHubTreeEntry[];
  skillMarkdownByPath: Record<string, string | undefined>;
  existingImports: ExistingGitHubImport[];
}): GitHubSkillCandidate[] {
  return tree
    .filter((entry) => entry.type === "blob" && isSkillMarkdownCandidate(entry.path))
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((entry) => {
      const skillRoot = skillRootForSkillMarkdown(entry.path);
      const files = tree
        .filter((file) => file.type === "blob" && (file.path === entry.path || file.path.startsWith(`${skillRoot}/`)))
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((file) => ({
          path: file.path,
          relativePath: relativeSkillFilePath(skillRoot, file.path),
          size: file.size ?? 0,
        }))
        .sort(compareSkillFiles);
      const oversizedFiles = files.filter((file) => file.size > MAX_GITHUB_IMPORT_FILE_BYTES);
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const validation = validateSkillMarkdown({
        markdown: skillMarkdownByPath[entry.path] ?? "",
        parentDirectoryName: parentDirectoryName(entry.path),
      });
      const existingImport = existingImportFor({
        existingImports,
        repositoryId: repository.repositoryId,
        skillRoot,
      });
      const status: GitHubSkillCandidateStatus = validation.valid
        ? existingImport
          ? "already_imported"
          : "valid"
        : "invalid";
      const skillName =
        validation.name ||
        parentDirectoryName(entry.path) ||
        "unknown-skill";

      return {
        id: candidateId(repository.repositoryId, skillRoot),
        repositoryId: repository.repositoryId,
        repoFullName: repository.repoFullName,
        branch: repository.defaultBranch,
        skillRoot,
        skillName,
        ...(validation.description ? { description: validation.description } : {}),
        status,
        ...(validation.valid ? {} : { reason: validation.reason }),
        ...(existingImport?.skillId ? { existingSkillId: existingImport.skillId } : {}),
        files,
        oversizedFiles,
        totalSize,
        totalSizeExceedsLimit: totalSize > MAX_GITHUB_IMPORT_SKILL_BYTES,
      };
    });
}
