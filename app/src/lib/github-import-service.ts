import {
  createSkillDraft,
  createSkillFile,
  listPublishingTargets,
  updateSkillFileText,
  type SkillStore,
} from "@/lib/skills/repository";

export type GitHubSkillImportRepository = {
  repositoryId: string;
  repoFullName: string;
  defaultBranch: string;
};

export type GitHubSkillImportCandidate = {
  skillRoot: string;
  skillName: string;
  description?: string | null;
};

export type GitHubSkillImportFile = {
  relativePath: string;
  content: Buffer;
  mimeType?: string | null;
};

export type UploadedGitHubImportAsset = {
  storageFileId: string;
  storageUrl?: string | null;
  mimeType?: string | null;
};

function isTextBuffer(content: Buffer) {
  if (content.includes(0)) {
    return false;
  }
  return !content.toString("utf8").includes("\uFFFD");
}

function fileKindForPath(path: string, isText: boolean) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".md") || lower === "skill.md") {
    return "markdown";
  }
  if (lower.endsWith(".json")) {
    return "json";
  }
  return isText ? "text" : "asset";
}

function mimeTypeForPath(path: string, isText: boolean) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".md") || lower === "skill.md") {
    return "text/markdown";
  }
  if (lower.endsWith(".json")) {
    return "application/json";
  }
  return isText ? "text/plain" : "application/octet-stream";
}

export async function importGitHubSkillCandidate({
  store,
  now = () => Date.now(),
  idGenerator,
  skillIdGenerator,
  ownerId,
  baseUrl,
  installationId,
  repository,
  candidate,
  files,
  uploadAssetFile,
}: {
  store: SkillStore;
  now?: () => number;
  idGenerator?: () => string;
  skillIdGenerator: () => string;
  ownerId: string;
  baseUrl: string;
  installationId: string;
  repository: GitHubSkillImportRepository;
  candidate: GitHubSkillImportCandidate;
  files: GitHubSkillImportFile[];
  uploadAssetFile?: (file: GitHubSkillImportFile) => Promise<UploadedGitHubImportAsset>;
}) {
  const skillFile = files.find((file) => file.relativePath === "SKILL.md");
  if (!skillFile) {
    throw new Error("SKILL.md is required");
  }

  const created = await createSkillDraft({
    store,
    now,
    ...(idGenerator ? { idGenerator } : {}),
    skillIdGenerator,
    ownerId,
    name: candidate.skillName,
    description: candidate.description,
    baseUrl,
    sourceMode: "github_import",
    originalRepoFullName: repository.repoFullName,
    originalRepositoryId: repository.repositoryId,
    originalSkillPath: candidate.skillRoot,
  });

  await updateSkillFileText({
    store,
    now,
    ownerId,
    fileId: created.file.id,
    path: "SKILL.md",
    contentText: skillFile.content.toString("utf8"),
  });

  for (const file of files) {
    if (file.relativePath === "SKILL.md") {
      continue;
    }

    const isText = isTextBuffer(file.content);
    const kind = fileKindForPath(file.relativePath, isText);
    const mimeType = file.mimeType || mimeTypeForPath(file.relativePath, isText);

    if (isText) {
      await createSkillFile({
        store,
        now,
        ...(idGenerator ? { idGenerator } : {}),
        ownerId,
        skillId: created.skill.skillId,
        versionId: created.version.id,
        path: file.relativePath,
        kind,
        mimeType,
        contentText: file.content.toString("utf8"),
      });
      continue;
    }

    if (!uploadAssetFile) {
      throw new Error(`asset upload is required for ${file.relativePath}`);
    }
    const uploaded = await uploadAssetFile(file);
    await createSkillFile({
      store,
      now,
      ...(idGenerator ? { idGenerator } : {}),
      ownerId,
      skillId: created.skill.skillId,
      versionId: created.version.id,
      path: file.relativePath,
      kind: "asset",
      mimeType: uploaded.mimeType || mimeType,
      storageFileId: uploaded.storageFileId,
      storageUrl: uploaded.storageUrl,
    });
  }

  const targets = await listPublishingTargets({ store, ownerId, skillId: created.skill.skillId });
  const githubTarget = targets.find((target) => target.targetKind === "github");
  if (githubTarget) {
    await store.transact([
      store.update("publishingTargets", githubTarget.id, {
        repoFullName: repository.repoFullName,
        repositoryId: repository.repositoryId,
        installationId,
        skillRoot: candidate.skillRoot,
        baseBranch: repository.defaultBranch,
        autoMerge: false,
        consentStatus: "pending",
        updatedAt: now(),
      }),
    ]);
  }

  return created;
}
