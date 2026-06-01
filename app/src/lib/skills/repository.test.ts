import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAuthorizedGitHubPublishingTarget,
  buildPublishContextForSkill,
  createSkillDraft,
  createSkillFile,
  deleteSkillDraft,
  deleteSkillFile,
  listSkillFiles,
  markDraftPublished,
  updateSkillMetadata,
  updateSkillFileText,
} from "./repository";
import { AGENT_SKILLS_SPEC_URL, buildSkillMarkdown } from "./skill-frontmatter";

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
    skillAccessGrants: {},
    skillInviteNotifications: {},
    skillUsageEvents: {},
    feedback: {},
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
  assert.equal(created.skill.anyoneWithLinkCanUse, false);
  assert.equal(created.version.status, "draft");
  assert.equal(created.version.version, "1");
  assert.equal(created.version.versionNumber, 1);
  assert.equal(created.file.path, "SKILL.md");
  assert.doesNotMatch(created.file.contentText ?? "", /Skillfully feedback and updates/);
  assert.equal(Object.keys(store.rows.publishingTargets).length, 4);
  assert.equal(
    Object.values(store.rows.publishingTargets).find((target) => target.targetKind === "skillfully")?.consentStatus,
    "granted",
  );
  assert.equal(
    Object.values(store.rows.publishingTargets).find((target) => target.targetKind === "github"),
    undefined,
  );
});

test("updateSkillMetadata can toggle private link-use access", async () => {
  const store = new InMemorySkillStore();
  let counter = 0;

  await createSkillDraft({
    store,
    now: () => 1700000000000,
    idGenerator: () => `id_${++counter}`,
    skillIdGenerator: () => "sk_demo",
    ownerId: "user-1",
    name: "Customer Support",
    description: "Answers support questions.",
    baseUrl: "https://www.skillfully.sh",
  });

  const updated = await updateSkillMetadata({
    store,
    now: () => 1700000000100,
    ownerId: "user-1",
    skillId: "sk_demo",
    anyoneWithLinkCanUse: true,
  });

  assert.equal(updated.anyoneWithLinkCanUse, true);
  assert.equal(Object.values(store.rows.skills)[0].anyoneWithLinkCanUse, true);
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

test("publish context does not fall back to Skillfully's default GitHub installation for imported skills", async () => {
  const previousDefaultRepo = process.env.SKILLFULLY_DEFAULT_SKILLS_REPO;
  const previousDefaultInstallation = process.env.SKILLFULLY_DEFAULT_GITHUB_INSTALLATION_ID;
  process.env.SKILLFULLY_DEFAULT_SKILLS_REPO = "erensunerr/skillfully-skills";
  process.env.SKILLFULLY_DEFAULT_GITHUB_INSTALLATION_ID = "internal-installation";

  try {
    const store = new InMemorySkillStore();
    let counter = 0;
    await createSkillDraft({
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

    const context = await buildPublishContextForSkill({
      store,
      ownerId: "user-1",
      skillId: "sk_imported",
    });

    assert.equal(context.defaultGitHubRepo, null);
    assert.equal(context.githubTarget?.repoFullName, "octocat/Hello-World");
    assert.equal(context.githubTarget?.installationId, "");
    assert.equal(context.githubTarget?.skillRoot, ".agents/skills/code-review");
  } finally {
    if (previousDefaultRepo === undefined) {
      delete process.env.SKILLFULLY_DEFAULT_SKILLS_REPO;
    } else {
      process.env.SKILLFULLY_DEFAULT_SKILLS_REPO = previousDefaultRepo;
    }
    if (previousDefaultInstallation === undefined) {
      delete process.env.SKILLFULLY_DEFAULT_GITHUB_INSTALLATION_ID;
    } else {
      process.env.SKILLFULLY_DEFAULT_GITHUB_INSTALLATION_ID = previousDefaultInstallation;
    }
  }
});

test("publish context rejects GitHub targets bound to another account installation", async () => {
  const store = new InMemorySkillStore();
  let counter = 0;
  await createSkillDraft({
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
  await store.transact([
    store.create("githubInstallations", "installation-owned", {
      ownerId: "user-1",
      installationId: "installation-1",
      accountLogin: "octocat",
      accountType: "User",
    }),
    store.create("githubRepositories", "repo-owned", {
      ownerId: "user-1",
      installationId: "installation-1",
      repositoryId: "1296269",
      repoFullName: "octocat/Hello-World",
      defaultBranch: "main",
      selected: true,
    }),
  ]);
  const githubTarget = Object.entries(store.rows.publishingTargets).find(
    ([, target]) => target.targetKind === "github",
  );
  assert.ok(githubTarget);
  await store.transact([
    store.update("publishingTargets", githubTarget[0], {
      repoFullName: "victim/private-repo",
      repositoryId: "987654",
      installationId: "victim-installation",
      consentStatus: "granted",
    }),
  ]);

  await assert.rejects(
    () =>
      buildPublishContextForSkill({
        store,
        ownerId: "user-1",
        skillId: "sk_imported",
      }),
    /GitHub App installation is not connected to this account/,
  );
});

test("publish context includes only owner-authorized GitHub targets", async () => {
  const store = new InMemorySkillStore();
  let counter = 0;
  await createSkillDraft({
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
  await store.transact([
    store.create("githubInstallations", "installation-owned", {
      ownerId: "user-1",
      installationId: "installation-1",
      accountLogin: "octocat",
      accountType: "User",
    }),
    store.create("githubRepositories", "repo-owned", {
      ownerId: "user-1",
      installationId: "installation-1",
      repositoryId: "1296269",
      repoFullName: "octocat/Hello-World",
      defaultBranch: "main",
      selected: true,
    }),
  ]);
  const githubTarget = Object.entries(store.rows.publishingTargets).find(
    ([, target]) => target.targetKind === "github",
  );
  assert.ok(githubTarget);
  await store.transact([
    store.update("publishingTargets", githubTarget[0], {
      repoFullName: "octocat/Hello-World",
      repositoryId: "1296269",
      installationId: "installation-1",
      consentStatus: "granted",
    }),
  ]);

  const context = await buildPublishContextForSkill({
    store,
    ownerId: "user-1",
    skillId: "sk_imported",
  });

  assert.equal(context.githubTarget?.repoFullName, "octocat/Hello-World");
  assert.equal(context.githubTarget?.installationId, "installation-1");
  assert.equal((context.githubTarget as Record<string, unknown> | null | undefined)?.consentStatus, "granted");
});

test("GitHub publishing target authorization rejects repos outside the owner installation", async () => {
  const store = new InMemorySkillStore();
  await store.transact([
    store.create("githubInstallations", "installation-owned", {
      ownerId: "user-1",
      installationId: "installation-1",
      accountLogin: "octocat",
      accountType: "User",
    }),
    store.create("githubRepositories", "repo-owned", {
      ownerId: "user-1",
      installationId: "installation-1",
      repositoryId: "1296269",
      repoFullName: "octocat/Hello-World",
      defaultBranch: "main",
      selected: true,
    }),
  ]);

  await assert.rejects(
    () =>
      assertAuthorizedGitHubPublishingTarget({
        store,
        ownerId: "user-1",
        installationId: "installation-1",
        repoFullName: "victim/private-repo",
      }),
    /GitHub repository is not available for this installation/,
  );
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

  const editableFile = await createSkillFile({
    store,
    now: () => 1700000000050,
    idGenerator: () => `id_${++counter}`,
    ownerId: "user-1",
    skillId: "sk_demo",
    versionId: created.version.id,
    path: "docs/original.md",
    kind: "markdown",
    contentText: "# Original",
  });

  const updated = await updateSkillFileText({
    store,
    now: () => 1700000000100,
    ownerId: "user-1",
    fileId: editableFile.id,
    contentText: "# Updated",
    path: "/docs/updated.md",
  });

  assert.equal(updated.path, "docs/updated.md");
  assert.equal(updated.sha256.length, 64);
  await assert.rejects(
    () =>
      updateSkillFileText({
        store,
        now: () => 1700000000150,
        ownerId: "user-1",
        fileId: created.file.id,
        contentText: created.file.contentText ?? "",
        path: "docs/renamed.md",
      }),
    /primary skill file cannot be renamed/,
  );
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

  const editableSkillMarkdown = buildSkillMarkdown({
    name: "demo",
    description: "Demo skill",
    body: "# Editable",
  });
  const contentWithManagedBlock = [
    editableSkillMarkdown,
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
  assert.equal(updated.contentText, editableSkillMarkdown);

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
  assert.equal(added.contentText, editableSkillMarkdown);
});

test("SKILL.md mutations reject invalid Agent Skills frontmatter with the spec link", async () => {
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

  await assert.rejects(
    () =>
      updateSkillFileText({
        store,
        now: () => 1700000000100,
        ownerId: "user-1",
        fileId: created.file.id,
        contentText: "# Missing frontmatter",
      }),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.match((error as Error).message, /Invalid SKILL\.md/);
      assert.match((error as Error).message, new RegExp(AGENT_SKILLS_SPEC_URL.replaceAll(".", "\\.")));
      return true;
    },
  );

  await assert.rejects(
    () =>
      createSkillFile({
        store,
        now: () => 1700000000200,
        idGenerator: () => `id_${++counter}`,
        ownerId: "user-1",
        skillId: "sk_demo",
        versionId: created.version.id,
        path: "nested/SKILL.md",
        kind: "markdown",
        contentText: "# Missing frontmatter",
      }),
    /Invalid SKILL\.md/,
  );
});

test("imported skills must keep SKILL.md name aligned with the GitHub skill directory", async () => {
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

  await assert.rejects(
    () =>
      updateSkillFileText({
        store,
        now: () => 1700000000100,
        ownerId: "user-1",
        fileId: created.file.id,
        contentText: buildSkillMarkdown({
          name: "different-skill",
          description: "Different skill.",
          body: "Instructions.",
        }),
      }),
    /name must match package directory `code-review`/,
  );
});

test("publish context rejects packages with invalid SKILL.md frontmatter", async () => {
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

  store.rows.skillFiles[created.file.id].contentText = "# Broken package";

  await assert.rejects(
    () =>
      buildPublishContextForSkill({
        store,
        ownerId: "user-1",
        skillId: "sk_demo",
      }),
    /Invalid SKILL\.md/,
  );
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
    contentText: buildSkillMarkdown({
      name: "demo",
      description: "Demo skill",
      body: "# Published content",
    }),
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
  assert.equal(publishedVersions[0].version, "1");
  assert.equal(publishedVersions[0].versionNumber, 1);
  assert.equal(draftVersions[0].version, "2");
  assert.equal(draftVersions[0].versionNumber, 2);
  assert.notEqual(draftVersions[0].id, created.version.id);

  const skill = Object.values(store.rows.skills)[0];
  assert.equal(skill.publishedVersionId, created.version.id);
  assert.equal(skill.currentDraftVersionId, draftVersions[0].id);
  assert.equal(skill.visibility, "private");
  assert.match(
    JSON.stringify(publishedVersions[0].manifestJson),
    /api\/skills\/sk_demo\/manifest/,
  );

  const draftFiles = Object.values(store.rows.skillFiles).filter(
    (file) => file.versionId === draftVersions[0].id,
  );
  assert.equal(draftFiles.length, 1);
  assert.equal(draftFiles[0].path, "SKILL.md");
  assert.equal(
    draftFiles[0].contentText,
    buildSkillMarkdown({
      name: "demo",
      description: "Demo skill",
      body: "# Published content",
    }),
  );
});

test("deleteSkillDraft removes the skill and owned records", async () => {
  const store = new InMemorySkillStore();
  let counter = 0;
  const created = await createSkillDraft({
    store,
    now: () => 1700000000000,
    idGenerator: () => `id_${++counter}`,
    skillIdGenerator: () => "sk_delete_me",
    ownerId: "user-1",
    name: "Delete Me",
    description: "Temporary skill",
    baseUrl: "https://www.skillfully.sh",
  });
  const extraFile = await createSkillFile({
    store,
    now: () => 1700000000100,
    idGenerator: () => `id_${++counter}`,
    ownerId: "user-1",
    skillId: "sk_delete_me",
    versionId: created.version.id,
    path: "notes.md",
    kind: "markdown",
    contentText: "# Notes",
  });
  store.rows.skillAccessGrants.grant_1 = {
    ownerId: "user-1",
    skillId: "sk_delete_me",
    granteeEmail: "collaborator@example.com",
    permission: "edit",
    status: "active",
    createdByUserId: "user-1",
    createdAt: 1700000000200,
    updatedAt: 1700000000200,
  };
  store.rows.skillInviteNotifications.invite_1 = {
    ownerId: "user-1",
    skillId: "sk_delete_me",
    grantId: "grant_1",
    toEmail: "collaborator@example.com",
    fromUserId: "user-1",
    deliveryStatus: "sent",
    createdAt: 1700000000200,
    updatedAt: 1700000000200,
  };
  store.rows.skillUsageEvents.usage_1 = {
    ownerId: "user-1",
    skillId: "sk_delete_me",
    eventKind: "manifest_checked",
    dayKey: "2026-05-20",
    createdAt: 1700000000300,
  };
  store.rows.feedback.feedback_1 = {
    ownerId: "user-1",
    skillId: "sk_delete_me",
    rating: "positive",
    feedback: "Useful.",
    createdAt: 1700000000400,
  };

  const deleted = await deleteSkillDraft({
    store,
    ownerId: "user-1",
    skillId: "sk_delete_me",
  });

  assert.equal(deleted.skillId, "sk_delete_me");
  assert.equal(store.rows.skills[created.skill.id], undefined);
  assert.equal(store.rows.skillVersions[created.version.id], undefined);
  assert.equal(store.rows.skillFiles[created.file.id], undefined);
  assert.equal(store.rows.skillFiles[extraFile.id], undefined);
  assert.equal(Object.values(store.rows.publishingTargets).some((row) => row.skillId === "sk_delete_me"), false);
  assert.equal(Object.values(store.rows.skillAccessGrants).some((row) => row.skillId === "sk_delete_me"), false);
  assert.equal(Object.values(store.rows.skillInviteNotifications).some((row) => row.skillId === "sk_delete_me"), false);
  assert.equal(Object.values(store.rows.skillUsageEvents).some((row) => row.skillId === "sk_delete_me"), false);
  assert.equal(Object.values(store.rows.feedback).some((row) => row.skillId === "sk_delete_me"), false);
});
