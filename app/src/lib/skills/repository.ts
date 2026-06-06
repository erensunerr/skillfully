import crypto from "node:crypto";

import { adminDb } from "@/lib/adminDb";
import {
  appendSkillfullyManagedBlock,
  buildSkillManifest,
  createDefaultSkillFile,
  isPrimarySkillMarkdownPath,
  normalizeSkillFilePath,
  skillSlug,
  stripSkillfullyManagedBlock,
} from "./skill-files";
import {
  SkillFrontmatterValidationError,
  assertValidSkillMarkdown,
  skillSpecName,
} from "./skill-frontmatter";
import type { PublishContext, PublishResult } from "@/lib/publishing/types";

type EntityName =
  | "skills"
  | "skillVersions"
  | "skillFiles"
  | "publishingTargets"
  | "publishRuns"
  | "directorySubmissions"
  | "skillUsageEvents"
  | "skillAccessGrants"
  | "skillInviteNotifications"
  | "feedback"
  | "githubInstallations"
  | "githubRepositories"
  | "skillImports";

type Row = Record<string, unknown>;
type QueryInput = Record<string, { $?: { where?: Record<string, unknown>; order?: Record<string, "asc" | "desc"> } }>;

export type SkillStore = {
  query(query: QueryInput): Promise<Record<string, Row[]>>;
  create(entity: EntityName, id: string, values: Row): unknown;
  update(entity: EntityName, id: string, values: Row): unknown;
  delete(entity: EntityName, id: string): unknown;
  transact(ops: unknown[]): Promise<void>;
};

export type SkillRow = {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  skillId: string;
  slug: string;
  status: string;
  visibility: string;
  sourceMode: string;
  originalRepoFullName?: string;
  originalRepositoryId?: string;
  originalSkillPath?: string;
  currentDraftVersionId: string;
  publishedVersionId?: string;
  createdAt: number;
  updatedAt: number;
};

export type SkillVersionRow = {
  id: string;
  ownerId: string;
  skillId: string;
  version: string;
  versionNumber?: number;
  status: string;
  summary?: string;
  manifestJson?: unknown;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
};

export type SkillFileRow = {
  id: string;
  ownerId: string;
  skillId: string;
  versionId: string;
  fileKey: string;
  path: string;
  kind: string;
  mimeType?: string;
  size?: number;
  sha256?: string;
  contentText?: string;
  storageFileId?: string;
  storageUrl?: string;
  createdAt: number;
  updatedAt: number;
};

export type PublishingTargetRow = {
  id: string;
  ownerId: string;
  skillId: string;
  targetKind: string;
  status: string;
  repoFullName?: string;
  repositoryId?: string;
  installationId?: string;
  skillRoot?: string;
  baseBranch?: string;
  autoMerge?: boolean;
  consentStatus?: string;
  configJson?: unknown;
  createdAt: number;
  updatedAt: number;
};

const GITHUB_REPO_FULL_NAME_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const GITHUB_INSTALLATION_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function normalizeGitHubRepoFullName(value: string) {
  const normalized = value.trim();
  if (!GITHUB_REPO_FULL_NAME_PATTERN.test(normalized)) {
    throw new Error("invalid GitHub repository");
  }
  return normalized;
}

function normalizeGitHubInstallationId(value: string) {
  const normalized = value.trim();
  if (!normalized || !GITHUB_INSTALLATION_ID_PATTERN.test(normalized)) {
    throw new Error("invalid GitHub App installation");
  }
  return normalized;
}

export async function assertAuthorizedGitHubPublishingTarget({
  store = defaultSkillStore,
  ownerId,
  installationId,
  repoFullName,
}: {
  store?: SkillStore;
  ownerId: string;
  installationId: string;
  repoFullName: string;
}) {
  const normalizedInstallationId = normalizeGitHubInstallationId(installationId);
  const normalizedRepoFullName = normalizeGitHubRepoFullName(repoFullName);
  const rows = await store.query({
    githubInstallations: {
      $: {
        where: {
          ownerId,
          installationId: normalizedInstallationId,
        },
      },
    },
    githubRepositories: {
      $: {
        where: {
          ownerId,
          installationId: normalizedInstallationId,
          repoFullName: normalizedRepoFullName,
        },
      },
    },
  });
  if ((rows.githubInstallations ?? []).length === 0) {
    throw new Error("GitHub App installation is not connected to this account");
  }
  const repository = (rows.githubRepositories ?? []).find((row) => row.selected !== false);
  if (!repository) {
    throw new Error("GitHub repository is not available for this installation");
  }

  return {
    installationId: normalizedInstallationId,
    repoFullName: normalizedRepoFullName,
    repositoryId: typeof repository.repositoryId === "string" ? repository.repositoryId : undefined,
    defaultBranch: typeof repository.defaultBranch === "string" ? repository.defaultBranch : undefined,
  };
}

function makeAdminStore(): SkillStore {
  const tx = adminDb.tx as unknown as Record<EntityName, Record<string, {
    create: (values: Row) => unknown;
    update: (values: Row) => unknown;
    delete: () => unknown;
  }>>;

  return {
    async query(query) {
      return adminDb.query(query as never) as Promise<Record<string, Row[]>>;
    },
    create(entity, id, values) {
      return tx[entity][id].create(values);
    },
    update(entity, id, values) {
      return tx[entity][id].update(values);
    },
    delete(entity, id) {
      return tx[entity][id].delete();
    },
    async transact(ops) {
      await adminDb.transact(ops as never);
    },
  };
}

export const defaultSkillStore = makeAdminStore();

function hashText(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function releaseVersionNumber(version: Pick<SkillVersionRow, "version" | "versionNumber">) {
  if (typeof version.versionNumber === "number" && Number.isFinite(version.versionNumber) && version.versionNumber > 0) {
    return Math.floor(version.versionNumber);
  }

  const integerVersion = Number.parseInt(version.version, 10);
  if (/^\d+$/.test(version.version) && Number.isFinite(integerVersion) && integerVersion > 0) {
    return integerVersion;
  }

  return 1;
}

function defaultGitHubRepo() {
  return {
    repoFullName: process.env.SKILLFULLY_DEFAULT_SKILLS_REPO || "erensunerr/skillfully-skills",
    installationId: process.env.SKILLFULLY_DEFAULT_GITHUB_INSTALLATION_ID || "",
    baseBranch: process.env.SKILLFULLY_DEFAULT_SKILLS_REPO_BRANCH || "main",
  };
}

function pathSegments(path: string) {
  return path.split("/").filter(Boolean);
}

function skillPackageDirectoryName(
  skill: Pick<SkillRow, "name" | "slug" | "sourceMode" | "originalSkillPath">,
) {
  if (skill.sourceMode === "github_import" && skill.originalSkillPath) {
    return pathSegments(skill.originalSkillPath).at(-1) || skillSpecName(skill.name);
  }

  return skill.slug || skillSpecName(skill.name);
}

function assertValidSkillFileForPackage({
  skill,
  contentText,
}: {
  skill: Pick<SkillRow, "name" | "slug" | "sourceMode" | "originalSkillPath">;
  contentText: string;
}) {
  return assertValidSkillMarkdown({
    markdown: contentText,
    expectedName: skillPackageDirectoryName(skill),
  });
}

function assertValidSkillPackage({
  skill,
  files,
}: {
  skill: Pick<SkillRow, "name" | "slug" | "sourceMode" | "originalSkillPath">;
  files: SkillFileRow[];
}) {
  const primarySkillFile = files.find((file) => file.path === "SKILL.md");
  if (!primarySkillFile || typeof primarySkillFile.contentText !== "string") {
    throw new SkillFrontmatterValidationError("root SKILL.md is required");
  }

  assertValidSkillFileForPackage({ skill, contentText: primarySkillFile.contentText });
}

function rowWithId<T extends Row>(row: T): T & { id: string } {
  return row as T & { id: string };
}

export async function createSkillDraft({
  store = defaultSkillStore,
  now = () => Date.now(),
  idGenerator = () => crypto.randomUUID(),
  skillIdGenerator,
  ownerId,
  name,
  description,
  body,
  baseUrl,
  sourceMode = "managed",
  originalRepoFullName,
  originalRepositoryId,
  originalSkillPath,
}: {
  store?: SkillStore;
  now?: () => number;
  idGenerator?: () => string;
  skillIdGenerator: () => string;
  ownerId: string;
  name: string;
  description?: string | null;
  body?: string | null;
  baseUrl: string;
  sourceMode?: string;
  originalRepoFullName?: string | null;
  originalRepositoryId?: string | null;
  originalSkillPath?: string | null;
}) {
  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error("skill name is required");
  }

  const currentTime = now();
  const entityId = idGenerator();
  const versionId = idGenerator();
  const fileId = idGenerator();
  const generatedSkillId = skillIdGenerator();
  const slug = skillSlug(cleanName);
  const cleanDescription = description?.trim() || undefined;
  const cleanBody = body?.trim() || undefined;
  const feedbackUrl = `${baseUrl.replace(/\/+$/, "")}/feedback/${generatedSkillId}`;
  const defaultFile = createDefaultSkillFile({
    name: cleanName,
    description: cleanDescription,
    body: cleanBody,
    feedbackUrl,
  });
  const repo = defaultGitHubRepo();

  const skill: SkillRow = {
    id: entityId,
    ownerId,
    name: cleanName,
    description: cleanDescription,
    skillId: generatedSkillId,
    slug,
    status: "draft",
    visibility: "private",
    sourceMode,
    ...(originalRepoFullName ? { originalRepoFullName } : {}),
    ...(originalRepositoryId ? { originalRepositoryId } : {}),
    ...(originalSkillPath ? { originalSkillPath } : {}),
    currentDraftVersionId: versionId,
    createdAt: currentTime,
    updatedAt: currentTime,
  };
  const version: SkillVersionRow = {
    id: versionId,
    ownerId,
    skillId: generatedSkillId,
    version: "1",
    versionNumber: 1,
    status: "draft",
    summary: cleanDescription,
    createdAt: currentTime,
    updatedAt: currentTime,
  };
  const file: SkillFileRow = {
    id: fileId,
    ownerId,
    skillId: generatedSkillId,
    versionId,
    fileKey: `${generatedSkillId}:${versionId}:SKILL.md`,
    path: defaultFile.path,
    kind: defaultFile.kind,
    mimeType: "text/markdown",
    size: Buffer.byteLength(defaultFile.contentText),
    sha256: hashText(defaultFile.contentText),
    contentText: defaultFile.contentText,
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  const primaryTarget: PublishingTargetRow = sourceMode === "github_import"
    ? {
        id: idGenerator(),
        ownerId,
        skillId: generatedSkillId,
        targetKind: "github",
        status: "enabled",
        ...(originalRepoFullName ? { repoFullName: originalRepoFullName } : {}),
        ...(originalRepositoryId ? { repositoryId: originalRepositoryId } : {}),
        ...(originalSkillPath ? { skillRoot: originalSkillPath } : {}),
        baseBranch: repo.baseBranch,
        autoMerge: false,
        consentStatus: "pending",
        createdAt: currentTime,
        updatedAt: currentTime,
      }
    : {
        id: idGenerator(),
        ownerId,
        skillId: generatedSkillId,
        targetKind: "skillfully",
        status: "enabled",
        consentStatus: "granted",
        configJson: {
          storage: "skillfully",
        },
        createdAt: currentTime,
        updatedAt: currentTime,
      };

  const targets: PublishingTargetRow[] = [
    primaryTarget,
    ...(["lobehub", "clawhub", "hermes"] as const).map((targetKind): PublishingTargetRow => ({
      id: idGenerator(),
      ownerId,
      skillId: generatedSkillId,
      targetKind,
      status: "enabled",
      consentStatus: "granted",
      createdAt: currentTime,
      updatedAt: currentTime,
    })),
  ];

  await store.transact([
    store.create("skills", entityId, withoutId(skill)),
    store.create("skillVersions", versionId, withoutId(version)),
    store.create("skillFiles", fileId, withoutId(file)),
    ...targets.map((target) => store.create("publishingTargets", target.id, withoutId(target))),
  ]);

  return { skill, version, file, targets };
}

function withoutId<T extends { id: string }>(row: T) {
  const { id: _id, ...values } = row;
  return values;
}

export async function getSkillForOwner({
  store = defaultSkillStore,
  ownerId,
  skillId,
}: {
  store?: SkillStore;
  ownerId: string;
  skillId: string;
}) {
  const rows = await store.query({
    skills: {
      $: {
        where: {
          ownerId,
          skillId,
        },
      },
    },
  });
  const skill = rows.skills?.[0];
  return skill ? rowWithId(skill) as SkillRow : null;
}

export async function listSkillsForOwner({
  store = defaultSkillStore,
  ownerId,
}: {
  store?: SkillStore;
  ownerId: string;
}) {
  const rows = await store.query({
    skills: {
      $: {
        where: {
          ownerId,
        },
      },
    },
  });

  return (rows.skills ?? [])
    .map((row) => rowWithId(row) as SkillRow)
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}

export async function updateSkillMetadata({
  store = defaultSkillStore,
  now = () => Date.now(),
  ownerId,
  skillId,
  name,
  description,
  visibility,
}: {
  store?: SkillStore;
  now?: () => number;
  ownerId: string;
  skillId: string;
  name?: string | null;
  description?: string | null;
  visibility?: string | null;
}) {
  const skill = await getSkillForOwner({ store, ownerId, skillId });
  if (!skill) {
    throw new Error("skill not found");
  }

  const cleanName = name === undefined || name === null ? skill.name : name.trim();
  if (!cleanName) {
    throw new Error("skill name is required");
  }

  const updates = {
    name: cleanName,
    slug: cleanName === skill.name ? skill.slug : skillSlug(cleanName),
    description: description === undefined ? skill.description : description?.trim() || undefined,
    visibility: visibility === undefined || visibility === null ? skill.visibility : String(visibility),
    updatedAt: now(),
  };
  if (updates.visibility !== "private" && updates.visibility !== "public") {
    throw new Error("visibility must be private or public");
  }
  await store.transact([store.update("skills", skill.id, updates)]);
  return {
    ...skill,
    ...updates,
  };
}

async function deleteRowsBySkill({
  store,
  entity,
  ownerId,
  skillId,
}: {
  store: SkillStore;
  entity: EntityName;
  ownerId: string;
  skillId: string;
}) {
  const rows = await store.query({
    [entity]: {
      $: {
        where: {
          ownerId,
          skillId,
        },
      },
    },
  });
  return (rows[entity] ?? []).map((row) => store.delete(entity, String(row.id)));
}

export async function deleteSkillDraft({
  store = defaultSkillStore,
  ownerId,
  skillId,
}: {
  store?: SkillStore;
  ownerId: string;
  skillId: string;
}) {
  const skill = await getSkillForOwner({ store, ownerId, skillId });
  if (!skill) {
    throw new Error("skill not found");
  }

  const relatedEntities: EntityName[] = [
    "skillFiles",
    "skillVersions",
    "publishingTargets",
    "publishRuns",
    "directorySubmissions",
    "skillUsageEvents",
    "skillAccessGrants",
    "skillInviteNotifications",
    "feedback",
  ];
  const relatedDeletes = await Promise.all(
    relatedEntities.map((entity) => deleteRowsBySkill({ store, entity, ownerId, skillId })),
  );
  await store.transact([
    ...relatedDeletes.flat(),
    store.delete("skills", skill.id),
  ]);
  return skill;
}

export async function getDraftVersion({
  store = defaultSkillStore,
  ownerId,
  skillId,
}: {
  store?: SkillStore;
  ownerId: string;
  skillId: string;
}) {
  const rows = await store.query({
    skillVersions: {
      $: {
        where: {
          ownerId,
          skillId,
          status: "draft",
        },
      },
    },
  });
  const version = rows.skillVersions?.[0];
  return version ? rowWithId(version) as SkillVersionRow : null;
}

export async function listSkillFiles({
  store = defaultSkillStore,
  ownerId,
  skillId,
  versionId,
}: {
  store?: SkillStore;
  ownerId: string;
  skillId: string;
  versionId: string;
}) {
  const rows = await store.query({
    skillFiles: {
      $: {
        where: {
          ownerId,
          skillId,
          versionId,
        },
      },
    },
  });

  return (rows.skillFiles ?? [])
    .map((row) => rowWithId(row) as SkillFileRow)
    .sort((a, b) => a.path.localeCompare(b.path));
}

export async function listPublishingTargets({
  store = defaultSkillStore,
  ownerId,
  skillId,
}: {
  store?: SkillStore;
  ownerId: string;
  skillId: string;
}) {
  const rows = await store.query({
    publishingTargets: {
      $: {
        where: {
          ownerId,
          skillId,
        },
      },
    },
  });

  return (rows.publishingTargets ?? []).map((row) => rowWithId(row) as PublishingTargetRow);
}

export async function listPublishRuns({
  store = defaultSkillStore,
  ownerId,
  skillId,
}: {
  store?: SkillStore;
  ownerId: string;
  skillId: string;
}) {
  const rows = await store.query({
    publishRuns: {
      $: {
        where: {
          ownerId,
          skillId,
        },
      },
    },
  });

  return (rows.publishRuns ?? [])
    .map((row) => rowWithId(row))
    .sort((a, b) => Number(b.startedAt) - Number(a.startedAt));
}

export async function listDirectorySubmissions({
  store = defaultSkillStore,
  ownerId,
  skillId,
}: {
  store?: SkillStore;
  ownerId: string;
  skillId: string;
}) {
  const rows = await store.query({
    directorySubmissions: {
      $: {
        where: {
          ownerId,
          skillId,
        },
      },
    },
  });

  return (rows.directorySubmissions ?? [])
    .map((row) => rowWithId(row))
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}

export async function updateSkillFileText({
  store = defaultSkillStore,
  now = () => Date.now(),
  ownerId,
  skillId,
  fileId,
  contentText,
  path,
}: {
  store?: SkillStore;
  now?: () => number;
  ownerId: string;
  skillId?: string;
  fileId: string;
  contentText: string;
  path?: string;
}) {
  const rows = await store.query({
    skillFiles: {
      $: {
        where: {
          ownerId,
          ...(skillId ? { skillId } : {}),
          id: fileId,
        },
      },
    },
  });
  const existing = rows.skillFiles?.[0];
  if (!existing) {
    throw new Error("skill file not found");
  }

  const updatedPath = path ? normalizeSkillFilePath(path) : String(existing.path);
  const collisionRows = await store.query({
    skillFiles: {
      $: {
        where: {
          ownerId,
          skillId: String(existing.skillId),
          versionId: String(existing.versionId),
          path: updatedPath,
        },
      },
    },
  });
  const pathCollision = (collisionRows.skillFiles ?? []).find((row) => row.id !== fileId);
  if (pathCollision) {
    throw new Error("skill file path already exists");
  }

  const existingPath = String(existing.path);
  if (isPrimarySkillMarkdownPath(existingPath) && !isPrimarySkillMarkdownPath(updatedPath)) {
    throw new Error("primary skill file cannot be renamed");
  }

  const currentTime = now();
  const updatedContentText = isPrimarySkillMarkdownPath(updatedPath)
    ? stripSkillfullyManagedBlock(contentText)
    : contentText;
  if (isPrimarySkillMarkdownPath(updatedPath)) {
    const skill = await getSkillForOwner({ store, ownerId, skillId: String(existing.skillId) });
    if (!skill) {
      throw new Error("skill not found");
    }
    assertValidSkillFileForPackage({ skill, contentText: updatedContentText });
  }
  const values = {
    path: updatedPath,
    contentText: updatedContentText,
    size: Buffer.byteLength(updatedContentText),
    sha256: hashText(updatedContentText),
    updatedAt: currentTime,
  };
  await store.transact([store.update("skillFiles", fileId, values)]);
  return {
    ...(rowWithId(existing) as SkillFileRow),
    ...values,
  };
}

export async function deleteSkillFile({
  store = defaultSkillStore,
  ownerId,
  skillId,
  fileId,
}: {
  store?: SkillStore;
  ownerId: string;
  skillId?: string;
  fileId: string;
}) {
  const rows = await store.query({
    skillFiles: {
      $: {
        where: {
          ownerId,
          ...(skillId ? { skillId } : {}),
          id: fileId,
        },
      },
    },
  });
  const existing = rows.skillFiles?.[0];
  if (!existing) {
    throw new Error("skill file not found");
  }
  const file = rowWithId(existing) as SkillFileRow;
  if (isPrimarySkillMarkdownPath(file.path)) {
    throw new Error("primary skill file cannot be deleted");
  }
  await store.transact([store.delete("skillFiles", fileId)]);
  return file;
}

export async function createSkillFile({
  store = defaultSkillStore,
  now = () => Date.now(),
  idGenerator = () => crypto.randomUUID(),
  ownerId,
  skillId,
  versionId,
  path,
  kind,
  contentText,
  mimeType,
  storageFileId,
  storageUrl,
}: {
  store?: SkillStore;
  now?: () => number;
  idGenerator?: () => string;
  ownerId: string;
  skillId: string;
  versionId: string;
  path: string;
  kind: string;
  contentText?: string | null;
  mimeType?: string | null;
  storageFileId?: string | null;
  storageUrl?: string | null;
}) {
  const skill = await getSkillForOwner({ store, ownerId, skillId });
  if (!skill) {
    throw new Error("skill not found");
  }
  const version = await getDraftVersion({ store, ownerId, skillId });
  if (!version || version.id !== versionId) {
    throw new Error("draft version not found");
  }

  const normalizedPath = normalizeSkillFilePath(path);
  const collisionRows = await store.query({
    skillFiles: {
      $: {
        where: {
          ownerId,
          skillId,
          versionId,
          path: normalizedPath,
        },
      },
    },
  });
  if ((collisionRows.skillFiles ?? []).length > 0) {
    throw new Error("skill file path already exists");
  }

  const currentTime = now();
  const text =
    contentText === undefined || contentText === null
      ? undefined
      : isPrimarySkillMarkdownPath(normalizedPath)
        ? stripSkillfullyManagedBlock(contentText)
        : contentText;
  if (isPrimarySkillMarkdownPath(normalizedPath)) {
    assertValidSkillFileForPackage({ skill, contentText: text ?? "" });
  }
  const id = idGenerator();
  const file: SkillFileRow = {
    id,
    ownerId,
    skillId,
    versionId,
    fileKey: `${skillId}:${versionId}:${normalizedPath}`,
    path: normalizedPath,
    kind,
    ...(mimeType ? { mimeType } : {}),
    ...(text !== undefined ? { size: Buffer.byteLength(text), sha256: hashText(text), contentText: text } : {}),
    ...(storageFileId ? { storageFileId } : {}),
    ...(storageUrl ? { storageUrl } : {}),
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  await store.transact([store.create("skillFiles", id, withoutId(file))]);
  return file;
}

export async function buildPublishContextForSkill({
  store = defaultSkillStore,
  ownerId,
  skillId,
}: {
  store?: SkillStore;
  ownerId: string;
  skillId: string;
}): Promise<PublishContext> {
  const skill = await getSkillForOwner({ store, ownerId, skillId });
  if (!skill) {
    throw new Error("skill not found");
  }
  const version = await getDraftVersion({ store, ownerId, skillId });
  if (!version) {
    throw new Error("draft version not found");
  }
  const files = await listSkillFiles({ store, ownerId, skillId, versionId: version.id });
  assertValidSkillPackage({ skill, files });
  const targets = await listPublishingTargets({ store, ownerId, skillId });
  const githubTarget = skill.sourceMode === "github_import"
    ? targets.find((target) => target.targetKind === "github")
    : null;
  const githubRepoFullName = githubTarget?.repoFullName || skill.originalRepoFullName || "";
  const githubInstallationId = githubTarget?.installationId || "";
  if (githubTarget && githubRepoFullName && githubInstallationId) {
    await assertAuthorizedGitHubPublishingTarget({
      store,
      ownerId,
      installationId: githubInstallationId,
      repoFullName: githubRepoFullName,
    });
  }

  return {
    skill: {
      skillId: skill.skillId,
      slug: skill.slug || skillSlug(skill.name),
      name: skill.name,
      visibility: skill.visibility,
      sourceMode: skill.sourceMode,
      originalSkillPath: skill.originalSkillPath,
    },
    version: {
      id: version.id,
      version: version.version,
    },
    files: files.map((file) => ({
      path: file.path,
      kind: file.kind,
      contentText:
        file.contentText !== undefined && isPrimarySkillMarkdownPath(file.path)
          ? appendSkillfullyManagedBlock(file.contentText ?? "", { skillId })
          : file.contentText,
      storageUrl: file.storageUrl,
    })),
    defaultGitHubRepo: null,
    githubTarget: githubTarget
      ? {
          repoFullName: githubRepoFullName,
          installationId: githubInstallationId,
          skillRoot: githubTarget.skillRoot,
          baseBranch: githubTarget.baseBranch,
          autoMerge: githubTarget.autoMerge,
          consentStatus: githubTarget.consentStatus,
        }
      : null,
  };
}

export async function recordPublishResult({
  store = defaultSkillStore,
  now = () => Date.now(),
  ownerId,
  skillId,
  versionId,
  result,
}: {
  store?: SkillStore;
  now?: () => number;
  ownerId: string;
  skillId: string;
  versionId: string;
  result: PublishResult;
}) {
  const currentTime = now();
  const id = crypto.randomUUID();
  const ops = [
    store.create("publishRuns", id, {
      ownerId,
      skillId,
      versionId,
      targetKind: result.targetKind,
      status: result.status,
      startedAt: currentTime,
      completedAt: currentTime,
      pullRequestUrl: result.url,
      error: result.error,
      detailsJson: result.details,
    }),
  ];

  if (result.status === "manual_ready") {
    ops.push(
      store.create("directorySubmissions", crypto.randomUUID(), {
        ownerId,
        skillId,
        versionId,
        targetKind: result.targetKind,
        status: result.status,
        packetJson: result.packet,
        externalUrl: result.url,
        createdAt: currentTime,
        updatedAt: currentTime,
      }),
    );
  }

  await store.transact(ops);
}

export async function markDraftPublished({
  store = defaultSkillStore,
  now = () => Date.now(),
  idGenerator = () => crypto.randomUUID(),
  ownerId,
  skillId,
  versionId,
}: {
  store?: SkillStore;
  now?: () => number;
  idGenerator?: () => string;
  ownerId: string;
  skillId: string;
  versionId: string;
}) {
  const skill = await getSkillForOwner({ store, ownerId, skillId });
  if (!skill) {
    throw new Error("skill not found");
  }
  const versionRows = await store.query({
    skillVersions: {
      $: {
        where: {
          ownerId,
          skillId,
        },
      },
    },
  });
  const version = (versionRows.skillVersions ?? [])
    .map((row) => rowWithId(row) as SkillVersionRow)
    .find((row) => row.id === versionId);
  if (!version) {
    throw new Error("draft version not found");
  }
  const files = await listSkillFiles({ store, ownerId, skillId, versionId });
  assertValidSkillPackage({ skill, files });
  const currentTime = now();
  const currentVersionNumber = releaseVersionNumber(version);
  const manifest = buildSkillManifest({
    skill,
    version: {
      id: versionId,
      version: String(currentVersionNumber),
      status: "published",
    },
    files: files.map((file) => ({
      ...file,
      storageUrl: file.storageUrl ?? null,
    })),
  });
  const nextDraftVersionId = idGenerator();
  const nextDraftVersion: SkillVersionRow = {
    id: nextDraftVersionId,
    ownerId,
    skillId,
    version: String(currentVersionNumber + 1),
    versionNumber: currentVersionNumber + 1,
    status: "draft",
    summary: version.summary,
    createdAt: currentTime,
    updatedAt: currentTime,
  };
  const nextDraftFiles = files.map((file) => {
    const nextFileId = idGenerator();
    const nextFile: SkillFileRow = {
      ...file,
      id: nextFileId,
      versionId: nextDraftVersionId,
      fileKey: `${skillId}:${nextDraftVersionId}:${file.path}`,
      createdAt: currentTime,
      updatedAt: currentTime,
    };
    return nextFile;
  });

  await store.transact([
    store.update("skillVersions", versionId, {
      version: String(currentVersionNumber),
      versionNumber: currentVersionNumber,
      status: "published",
      manifestJson: manifest,
      updatedAt: currentTime,
      publishedAt: currentTime,
    }),
    store.create("skillVersions", nextDraftVersionId, withoutId(nextDraftVersion)),
    ...nextDraftFiles.map((file) => store.create("skillFiles", file.id, withoutId(file))),
    store.update("skills", skill.id, {
      status: "published",
      publishedVersionId: versionId,
      currentDraftVersionId: nextDraftVersionId,
      updatedAt: currentTime,
    }),
  ]);
}
