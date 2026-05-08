import assert from "node:assert/strict";
import test from "node:test";

import { importGitHubSkillCandidate } from "./github-import-service";

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
    githubInstallations: {},
    githubRepositories: {},
    skillImports: {},
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

test("imports a GitHub skill candidate with relative text files and source publish target", async () => {
  const store = new InMemorySkillStore();
  let counter = 0;

  const imported = await importGitHubSkillCandidate({
    store,
    now: () => 1700000000000,
    idGenerator: () => `id_${++counter}`,
    skillIdGenerator: () => "sk_imported",
    ownerId: "user-1",
    baseUrl: "https://www.skillfully.sh",
    installationId: "installation-1",
    repository: {
      repositoryId: "1296269",
      repoFullName: "octocat/Hello-World",
      defaultBranch: "main",
    },
    candidate: {
      skillRoot: ".agents/skills/code-review",
      skillName: "code-review",
      description: "Reviews code changes. Use when checking a diff.",
    },
    files: [
      {
        relativePath: "SKILL.md",
        content: Buffer.from([
          "---",
          "name: code-review",
          "description: Reviews code changes. Use when checking a diff.",
          "---",
        ].join("\n")),
      },
      {
        relativePath: "scripts/check.sh",
        content: Buffer.from("#!/usr/bin/env bash\necho ok\n"),
      },
    ],
  });

  assert.equal(imported.skill.skillId, "sk_imported");
  assert.equal(imported.skill.originalRepositoryId, "1296269");
  assert.equal(imported.skill.originalSkillPath, ".agents/skills/code-review");

  const files = Object.values(store.rows.skillFiles).sort((a, b) =>
    String(a.path).localeCompare(String(b.path)),
  );
  assert.deepEqual(
    files.map((file) => file.path).sort(),
    ["scripts/check.sh", "SKILL.md"].sort(),
  );
  assert.equal(files.find((file) => file.path === "scripts/check.sh")?.contentText, "#!/usr/bin/env bash\necho ok\n");

  const githubTarget = Object.values(store.rows.publishingTargets).find(
    (target) => target.targetKind === "github",
  );
  assert.equal(githubTarget?.repoFullName, "octocat/Hello-World");
  assert.equal(githubTarget?.repositoryId, "1296269");
  assert.equal(githubTarget?.installationId, "installation-1");
  assert.equal(githubTarget?.skillRoot, ".agents/skills/code-review");
  assert.equal(githubTarget?.baseBranch, "main");
  assert.equal(githubTarget?.autoMerge, false);
});
