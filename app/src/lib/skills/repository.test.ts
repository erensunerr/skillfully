import assert from "node:assert/strict";
import test from "node:test";

import {
  createSkillDraft,
  createSkillFile,
  deleteSkillFile,
  listSkillFiles,
  markDraftPublished,
  updateSkillFileText,
} from "./repository";

type Row = Record<string, unknown>;
type Op =
  | { kind: "create"; entity: string; id: string; values: Row }
  | { kind: "update"; entity: string; id: string; values: Row }
  | { kind: "delete"; entity: string; id: string };

class InMemorySkillStore {
  rows: Record<string, Record<string, Row>> = {
    skills: {},
    skillVersions: {},
    skillFiles: {},
    publishingTargets: {},
    publishRuns: {},
    directorySubmissions: {},
  };

  create(entity: string, id: string, values: Row) {
    return { kind: "create" as const, entity, id, values };
  }

  update(entity: string, id: string, values: Row) {
    return { kind: "update" as const, entity, id, values };
  }

  delete(entity: string, id: string) {
    return { kind: "delete" as const, entity, id };
  }

  async transact(ops: Op[]) {
    for (const op of ops) {
      this.rows[op.entity] ??= {};
      if (op.kind === "delete") {
        delete this.rows[op.entity][op.id];
        continue;
      }
      this.rows[op.entity][op.id] = {
        ...(this.rows[op.entity][op.id] ?? {}),
        ...op.values,
      };
    }
  }

  async query(query: Record<string, { $?: { where?: Record<string, unknown> } }>) {
    const result: Record<string, Row[]> = {};
    for (const [entity, options] of Object.entries(query)) {
      const where = options.$?.where ?? {};
      result[entity] = Object.entries(this.rows[entity] ?? {})
        .map(([id, values]) => ({ id, ...values }) as Row)
        .filter((row) => Object.entries(where).every(([key, value]) => row[key] === value));
    }
    return result;
  }
}

test("createSkillDraft creates a draft version, default file, and publishing targets", async () => {
  const store = new InMemorySkillStore();
  let counter = 0;

  const created = await createSkillDraft({
    store,
    now: () => 1700000000000,
    idGenerator: () => `id_${++counter}`,
    skillIdGenerator: () => "sk_demo",
    ownerId: "user-1",
    name: "Customer Support",
    description: "Answers support questions.",
    baseUrl: "https://www.skillfully.sh",
  });

  assert.equal(created.skill.skillId, "sk_demo");
  assert.equal(created.skill.slug, "customer-support");
  assert.equal(created.version.status, "draft");
  assert.equal(created.file.path, "SKILL.md");
  assert.doesNotMatch(created.file.contentText ?? "", /Skillfully feedback and updates/);
  assert.equal(Object.keys(store.rows.publishingTargets).length, 4);
  assert.equal(
    Object.values(store.rows.publishingTargets).find((target) => target.targetKind === "github")?.repoFullName,
    "erensunerr/skillfully-skills",
  );
});

test("createSkillDraft stores durable GitHub metadata for imported skills", async () => {
  const store = new InMemorySkillStore();
  let counter = 0;

  const created = await createSkillDraft({
    store,
    now: () => 1700000000000,
    idGenerator: () => `id_${++counter}`,
    skillIdGenerator: () => "sk_imported",
    ownerId: "user-1",
    name: "code-review",
    description: "Reviews code changes.",
    baseUrl: "https://www.skillfully.sh",
    sourceMode: "github_import",
    originalRepoFullName: "octocat/Hello-World",
    originalRepositoryId: "1296269",
    originalSkillPath: ".agents/skills/code-review",
  });

  assert.equal(created.skill.sourceMode, "github_import");
  assert.equal(created.skill.originalRepositoryId, "1296269");
  assert.equal(created.skill.originalSkillPath, ".agents/skills/code-review");

  const githubTarget = Object.values(store.rows.publishingTargets).find(
    (target) => target.targetKind === "github",
  );
  assert.equal(githubTarget?.repoFullName, "octocat/Hello-World");
  assert.equal(githubTarget?.repositoryId, "1296269");
  assert.equal(githubTarget?.skillRoot, ".agents/skills/code-review");
  assert.equal(githubTarget?.autoMerge, false);
  assert.equal(githubTarget?.consentStatus, "pending");
});

test("listSkillFiles and updateSkillFileText enforce ownership and normalized paths", async () => {
  const store = new InMemorySkillStore();
  let counter = 0;
  const created = await createSkillDraft({
    store,
    now: () => 1700000000000,
    idGenerator: () => `id_${++counter}`,
    skillIdGenerator: () => "sk_demo",
    ownerId: "user-1",
    name: "Demo",
    description: "",
    baseUrl: "https://www.skillfully.sh",
  });

  const files = await listSkillFiles({
    store,
    ownerId: "user-1",
    skillId: "sk_demo",
    versionId: created.version.id,
  });
  assert.equal(files.length, 1);

  const updated = await updateSkillFileText({
    store,
    now: () => 1700000000100,
    ownerId: "user-1",
    fileId: created.file.id,
    contentText: "# Updated",
    path: "/docs/updated.md",
  });

  assert.equal(updated.path, "docs/updated.md");
  assert.equal(updated.sha256.length, 64);
  await assert.rejects(
    () =>
      createSkillFile({
        store,
        now: () => 1700000000200,
        idGenerator: () => `id_${++counter}`,
        ownerId: "user-1",
        skillId: "sk_demo",
        versionId: created.version.id,
        path: "docs/updated.md",
        kind: "markdown",
        contentText: "# Duplicate",
      }),
    /skill file path already exists/,
  );
  await assert.rejects(
    () =>
      updateSkillFileText({
        store,
        now: () => 1700000000100,
        ownerId: "user-2",
        fileId: created.file.id,
        contentText: "# Not yours",
      }),
    /skill file not found/,
  );
});

test("deleteSkillFile deletes non-primary files and protects SKILL.md", async () => {
  const store = new InMemorySkillStore();
  let counter = 0;
  const created = await createSkillDraft({
    store,
    now: () => 1700000000000,
    idGenerator: () => `id_${++counter}`,
    skillIdGenerator: () => "sk_demo",
    ownerId: "user-1",
    name: "Demo",
    description: "",
    baseUrl: "https://www.skillfully.sh",
  });
  const asset = await createSkillFile({
    store,
    now: () => 1700000000100,
    idGenerator: () => `id_${++counter}`,
    ownerId: "user-1",
    skillId: "sk_demo",
    versionId: created.version.id,
    path: "assets/logo.png",
    kind: "asset",
    storageFileId: "file-1",
    storageUrl: "https://example.com/logo.png",
  });

  const deleted = await deleteSkillFile({ store, ownerId: "user-1", fileId: asset.id });

  assert.equal(deleted.path, "assets/logo.png");
  assert.equal(store.rows.skillFiles[asset.id], undefined);
  await assert.rejects(
    () => deleteSkillFile({ store, ownerId: "user-1", fileId: created.file.id }),
    /primary skill file cannot be deleted/,
  );
});

test("text file mutations strip Skillfully-owned blocks from editable SKILL.md content", async () => {
  const store = new InMemorySkillStore();
  let counter = 0;
  const created = await createSkillDraft({
    store,
    now: () => 1700000000000,
    idGenerator: () => `id_${++counter}`,
    skillIdGenerator: () => "sk_demo",
    ownerId: "user-1",
    name: "Demo",
    description: "",
    baseUrl: "https://www.skillfully.sh",
  });

  const contentWithManagedBlock = [
    "# Editable",
    "",
    "<!-- skillfully:managed:start -->",
    "## Skillfully feedback and updates",
    "Managed text",
    "<!-- skillfully:managed:end -->",
  ].join("\n");

  const updated = await updateSkillFileText({
    store,
    now: () => 1700000000100,
    ownerId: "user-1",
    fileId: created.file.id,
    contentText: contentWithManagedBlock,
  });
  assert.equal(updated.contentText, "# Editable");

  const added = await createSkillFile({
    store,
    now: () => 1700000000200,
    idGenerator: () => `id_${++counter}`,
    ownerId: "user-1",
    skillId: "sk_demo",
    versionId: created.version.id,
    path: "nested/SKILL.md",
    kind: "markdown",
    contentText: contentWithManagedBlock,
  });
  assert.equal(added.contentText, "# Editable");
});

test("markDraftPublished freezes the published version and opens a new editable draft", async () => {
  const store = new InMemorySkillStore();
  let counter = 0;
  const created = await createSkillDraft({
    store,
    now: () => 1700000000000,
    idGenerator: () => `id_${++counter}`,
    skillIdGenerator: () => "sk_demo",
    ownerId: "user-1",
    name: "Demo",
    description: "Demo skill",
    baseUrl: "https://www.skillfully.sh",
  });
  await updateSkillFileText({
    store,
    now: () => 1700000000100,
    ownerId: "user-1",
    fileId: created.file.id,
    contentText: "# Published content",
  });

  await markDraftPublished({
    store,
    now: () => 1700000000200,
    ownerId: "user-1",
    skillId: "sk_demo",
    versionId: created.version.id,
  });

  const versions = Object.entries(store.rows.skillVersions).map(
    ([id, row]) => ({ id, ...row }) as Row & { id: string; status?: string; manifestJson?: unknown },
  );
  const publishedVersions = versions.filter((version) => version.status === "published");
  const draftVersions = versions.filter((version) => version.status === "draft");
  assert.equal(publishedVersions.length, 1);
  assert.equal(draftVersions.length, 1);
  assert.notEqual(draftVersions[0].id, created.version.id);

  const skill = Object.values(store.rows.skills)[0];
  assert.equal(skill.publishedVersionId, created.version.id);
  assert.equal(skill.currentDraftVersionId, draftVersions[0].id);
  assert.equal(skill.visibility, "public");
  assert.match(
    JSON.stringify(publishedVersions[0].manifestJson),
    /api\/public\/skills\/sk_demo\/manifest/,
  );

  const draftFiles = Object.values(store.rows.skillFiles).filter(
    (file) => file.versionId === draftVersions[0].id,
  );
  assert.equal(draftFiles.length, 1);
  assert.equal(draftFiles[0].path, "SKILL.md");
  assert.equal(draftFiles[0].contentText, "# Published content");
});
