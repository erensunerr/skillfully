import assert from "node:assert/strict";
import test from "node:test";

import { createSkillDraft, listSkillFiles, updateSkillFileText } from "./repository";

type Row = Record<string, unknown>;

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

  async transact(ops: Array<ReturnType<InMemorySkillStore["create"]> | ReturnType<InMemorySkillStore["update"]>>) {
    for (const op of ops) {
      this.rows[op.entity] ??= {};
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
        .map(([id, values]) => ({ id, ...values }))
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
  assert.match(created.file.contentText, /https:\/\/www\.skillfully\.sh\/feedback\/sk_demo/);
  assert.equal(Object.keys(store.rows.publishingTargets).length, 4);
  assert.equal(
    Object.values(store.rows.publishingTargets).find((target) => target.targetKind === "github")?.repoFullName,
    "erensunerr/skillfully-skills",
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
