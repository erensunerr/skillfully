import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_GITHUB_IMPORT_FILE_BYTES,
  createGitHubImportSession,
  discoverGitHubSkillCandidates,
  relativeSkillFilePath,
  validateSkillMarkdown,
} from "./github-import";

type Row = Record<string, unknown>;

class InMemoryImportStore {
  rows: Record<string, Record<string, Row>> = {
    skillImports: {},
  };

  create(entity: string, id: string, values: Row) {
    return { kind: "create" as const, entity, id, values };
  }

  async transact(ops: Array<{ kind: "create"; entity: string; id: string; values: Row }>) {
    for (const op of ops) {
      this.rows[op.entity] ??= {};
      this.rows[op.entity][op.id] = op.values;
    }
  }
}

const repository = {
  repositoryId: "1296269",
  repoFullName: "octocat/Hello-World",
  defaultBranch: "main",
};

test("discovers valid skills in any path containing a skills directory", () => {
  const candidates = discoverGitHubSkillCandidates({
    repository,
    tree: [
      { path: ".agents/skills/code-review/SKILL.md", type: "blob", size: 92 },
      { path: ".agents/skills/code-review/scripts/check.sh", type: "blob", size: 20 },
      { path: "docs/SKILL.md", type: "blob", size: 90 },
      { path: "packages/app/skills/test-writer/SKILL.md", type: "blob", size: 102 },
    ],
    skillMarkdownByPath: {
      ".agents/skills/code-review/SKILL.md": [
        "---",
        "name: code-review",
        "description: Reviews pull requests and code changes. Use when checking code.",
        "---",
        "",
        "# Code review",
      ].join("\n"),
      "packages/app/skills/test-writer/SKILL.md": [
        "---",
        "name: test-writer",
        "description: Writes focused tests. Use when adding behavior.",
        "---",
      ].join("\n"),
    },
    existingImports: [],
  });

  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].status, "valid");
  assert.equal(candidates[0].repoFullName, "octocat/Hello-World");
  assert.equal(candidates[0].skillName, "code-review");
  assert.equal(candidates[0].skillRoot, ".agents/skills/code-review");
  assert.deepEqual(
    candidates[0].files.map((file) => file.relativePath),
    ["SKILL.md", "scripts/check.sh"],
  );
  assert.equal(candidates[1].skillRoot, "packages/app/skills/test-writer");
});

test("marks invalid skill candidates with spec reasons", () => {
  const [missingName, mismatchedName] = discoverGitHubSkillCandidates({
    repository,
    tree: [
      { path: "skills/no-name/SKILL.md", type: "blob", size: 77 },
      { path: "skills/right-directory/SKILL.md", type: "blob", size: 82 },
    ],
    skillMarkdownByPath: {
      "skills/no-name/SKILL.md": [
        "---",
        "description: This is missing the required name.",
        "---",
      ].join("\n"),
      "skills/right-directory/SKILL.md": [
        "---",
        "name: wrong-directory",
        "description: The name does not match the parent directory.",
        "---",
      ].join("\n"),
    },
    existingImports: [],
  });

  assert.equal(missingName.status, "invalid");
  assert.match(missingName.reason ?? "", /name is required/);
  assert.equal(mismatchedName.status, "invalid");
  assert.match(mismatchedName.reason ?? "", /must match parent directory/);
});

test("marks already imported skills by repository id and skill root", () => {
  const [candidate] = discoverGitHubSkillCandidates({
    repository,
    tree: [{ path: "skills/code-review/SKILL.md", type: "blob", size: 92 }],
    skillMarkdownByPath: {
      "skills/code-review/SKILL.md": [
        "---",
        "name: code-review",
        "description: Reviews code. Use when checking a change.",
        "---",
      ].join("\n"),
    },
    existingImports: [
      {
        repositoryId: "1296269",
        skillRoot: "skills/code-review",
        skillId: "sk_existing",
      },
    ],
  });

  assert.equal(candidate.status, "already_imported");
  assert.equal(candidate.existingSkillId, "sk_existing");
});

test("validates Agent Skills frontmatter strictly", () => {
  assert.deepEqual(
    validateSkillMarkdown({
      markdown: [
        "---",
        "name: pdf-processing",
        "description: Extracts PDF text and tables. Use when processing PDFs.",
        "---",
        "",
        "Instructions.",
      ].join("\n"),
      parentDirectoryName: "pdf-processing",
    }),
    {
      valid: true,
      name: "pdf-processing",
      description: "Extracts PDF text and tables. Use when processing PDFs.",
    },
  );

  const missingFrontmatter = validateSkillMarkdown({
    markdown: "# Missing frontmatter",
    parentDirectoryName: "missing-frontmatter",
  });
  assert.equal(missingFrontmatter.valid, false);
  assert.match(missingFrontmatter.reason, /YAML frontmatter/);

  const uppercaseName = validateSkillMarkdown({
    markdown: ["---", "name: PDF-Processing", "description: Invalid uppercase.", "---"].join("\n"),
    parentDirectoryName: "pdf-processing",
  });
  assert.equal(uppercaseName.valid, false);
  assert.match(uppercaseName.reason, /lowercase/);

  const missingDescription = validateSkillMarkdown({
    markdown: ["---", "name: pdf-processing", "description: ", "---"].join("\n"),
    parentDirectoryName: "pdf-processing",
  });
  assert.equal(missingDescription.valid, false);
  assert.match(missingDescription.reason, /description is required/);
});

test("tracks file size warnings without making the skill invalid", () => {
  const [candidate] = discoverGitHubSkillCandidates({
    repository,
    tree: [
      { path: "skills/code-review/SKILL.md", type: "blob", size: 92 },
      { path: "skills/code-review/assets/model.bin", type: "blob", size: MAX_GITHUB_IMPORT_FILE_BYTES + 1 },
      ...Array.from({ length: 11 }, (_, index) => ({
        path: `skills/code-review/assets/data-${index}.bin`,
        type: "blob",
        size: MAX_GITHUB_IMPORT_FILE_BYTES,
      })),
    ],
    skillMarkdownByPath: {
      "skills/code-review/SKILL.md": [
        "---",
        "name: code-review",
        "description: Reviews code. Use when checking a change.",
        "---",
      ].join("\n"),
    },
    existingImports: [],
  });

  assert.equal(candidate.status, "valid");
  assert.equal(candidate.oversizedFiles.length, 1);
  assert.equal(candidate.oversizedFiles[0].relativePath, "assets/model.bin");
  assert.equal(candidate.totalSizeExceedsLimit, true);
});

test("keeps imported file paths relative to the skill root", () => {
  assert.equal(
    relativeSkillFilePath(".agents/skills/code-review", ".agents/skills/code-review/scripts/check.sh"),
    "scripts/check.sh",
  );
  assert.equal(
    relativeSkillFilePath(".agents/skills/code-review", ".agents/skills/code-review/SKILL.md"),
    "SKILL.md",
  );
  assert.throws(
    () => relativeSkillFilePath(".agents/skills/code-review", ".agents/other.txt"),
    /not inside skill root/,
  );
});

test("creates owner-scoped GitHub import sessions", async () => {
  const store = new InMemoryImportStore();

  const session = await createGitHubImportSession({
    store,
    now: () => 1700000000000,
    idGenerator: () => "row-1",
    sessionIdGenerator: () => "gis_session",
    ownerId: "user-1",
    installationId: "installation-1",
    accountLogin: "octocat",
    accountType: "User",
  });

  assert.equal(session.sessionId, "gis_session");
  assert.deepEqual(store.rows.skillImports["row-1"], {
    ownerId: "user-1",
    sessionId: "gis_session",
    installationId: "installation-1",
    accountLogin: "octocat",
    accountType: "User",
    status: "connected",
    discoveredCount: 0,
    importedCount: 0,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  });
});

test("default GitHub import session ids do not use Math.random", async () => {
  const store = new InMemoryImportStore();
  const originalRandom = Math.random;
  Math.random = () => {
    throw new Error("Math.random should not be used for session ids");
  };

  try {
    const session = await createGitHubImportSession({
      store,
      now: () => 1700000000000,
      idGenerator: () => "row-1",
      ownerId: "user-1",
      installationId: "installation-1",
      accountLogin: "octocat",
      accountType: "User",
    });

    assert.match(session.sessionId, /^gis_[a-z0-9]+$/);
    assert.equal(session.sessionId.length, 28);
  } finally {
    Math.random = originalRandom;
  }
});
