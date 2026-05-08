import crypto from "node:crypto";

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

export type SkillMarkdownValidation =
  | { valid: true; name: string; description: string }
  | { valid: false; reason: string; name?: string; description?: string };

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

function randomSessionId() {
  const chars = "abcdefghijkmnopqrstuvwxyz23456789";
  let out = "gis_";
  for (let index = 0; index < 24; index += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
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

function stripYamlQuotes(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return null;
  }

  const fields: Record<string, string> = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (field) {
      fields[field[1]] = stripYamlQuotes(field[2]);
    }
  }
  return fields;
}

function isValidSkillName(value: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(value) && !value.includes("--");
}

export function validateSkillMarkdown({
  markdown,
  parentDirectoryName,
}: {
  markdown: string;
  parentDirectoryName: string;
}): SkillMarkdownValidation {
  const frontmatter = parseFrontmatter(markdown);
  if (!frontmatter) {
    return { valid: false, reason: "SKILL.md must include YAML frontmatter" };
  }

  const name = frontmatter.name?.trim() ?? "";
  if (!name) {
    return { valid: false, reason: "name is required" };
  }
  if (name.length > 64) {
    return { valid: false, reason: "name must be 64 characters or fewer", name };
  }
  if (!isValidSkillName(name)) {
    return {
      valid: false,
      reason: "name must use lowercase letters, numbers, and hyphens only",
      name,
    };
  }
  if (name !== parentDirectoryName) {
    return {
      valid: false,
      reason: "name must match parent directory",
      name,
    };
  }

  const description = frontmatter.description?.trim() ?? "";
  if (!description) {
    return { valid: false, reason: "description is required", name };
  }
  if (description.length > 1024) {
    return { valid: false, reason: "description must be 1024 characters or fewer", name, description };
  }

  return { valid: true, name, description };
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
