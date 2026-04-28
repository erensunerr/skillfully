import assert from "node:assert/strict";
import test from "node:test";

import { resolveTokenOwner, listFeedbackForSkill } from "./agent-api";
import {
  approveAgentDeviceAuthorization,
  createAgentDeviceAuthorization,
  exchangeAgentDeviceCode,
} from "./agent-device-auth";
import { appendSkillfullyManagedBlock } from "./skills/managed-block";
import {
  createSkillDraft,
  listSkillFiles,
  markDraftPublished,
  updateSkillFileText,
} from "./skills/repository";

type Row = Record<string, unknown>;
type Op =
  | { kind: "create"; entity: string; id: string; values: Row }
  | { kind: "update"; entity: string; id: string; values: Row }
  | { kind: "delete"; entity: string; id: string };

class StakeholderStore {
  rows: Record<string, Record<string, Row>> = {
    agentDeviceCodes: {},
    apiTokens: {},
    skills: {},
    skillVersions: {},
    skillFiles: {},
    publishingTargets: {},
    publishRuns: {},
    directorySubmissions: {},
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

  async transact(ops: unknown[]) {
    for (const op of ops as Op[]) {
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

test("three stakeholder flow: human author, author agent, and skill user share a working lifecycle", async () => {
  const store = new StakeholderStore();
  let idCounter = 0;
  const idGenerator = () => `id_${++idCounter}`;
  const now = () => 1700000000000;

  const humanCreated = await createSkillDraft({
    store: store as never,
    now,
    idGenerator,
    skillIdGenerator: () => "sk_threeway",
    ownerId: "human-author",
    name: "Three Stakeholder Test",
    description: "Tests a shared authoring and usage lifecycle.",
    baseUrl: "https://www.skillfully.sh",
  });

  assert.doesNotMatch(humanCreated.file.contentText ?? "", /skillfully:managed:start/);

  const started = await createAgentDeviceAuthorization({
    agentName: "Codex author agent",
    baseUrl: "https://www.skillfully.sh",
  }, {
    store,
    now,
    idGenerator,
    deviceCodeGenerator: () => "device-threeway",
    userCodeGenerator: () => "TST1-FLOW",
    tokenGenerator: () => "agent-author-token",
  });
  assert.equal(started.userCode, "TST1-FLOW");

  await approveAgentDeviceAuthorization({
    userCode: started.userCode,
    ownerId: "human-author",
  }, {
    store,
    now,
    idGenerator,
    deviceCodeGenerator: () => "device-threeway",
    userCodeGenerator: () => "TST1-FLOW",
    tokenGenerator: () => "agent-author-token",
  });

  const token = await exchangeAgentDeviceCode({
    deviceCode: started.deviceCode,
  }, {
    store,
    now,
    idGenerator,
    deviceCodeGenerator: () => "device-threeway",
    userCodeGenerator: () => "TST1-FLOW",
    tokenGenerator: () => "agent-author-token",
  });
  const owner = await resolveTokenOwner(token.token, {
    now,
    db: store as never,
  });
  assert.equal(owner.userId, "human-author");

  const agentAuthoredContent = appendSkillfullyManagedBlock("# Agent edit\n\n## Workflow\n\n1. Do the shared work.", {
    skillId: humanCreated.skill.skillId,
    baseUrl: "https://www.skillfully.sh",
  });
  const updated = await updateSkillFileText({
    store: store as never,
    now,
    ownerId: owner.userId,
    fileId: humanCreated.file.id,
    contentText: agentAuthoredContent,
  });
  assert.equal(updated.contentText, "# Agent edit\n\n## Workflow\n\n1. Do the shared work.");

  const humanVisibleFiles = await listSkillFiles({
    store: store as never,
    ownerId: "human-author",
    skillId: humanCreated.skill.skillId,
    versionId: humanCreated.version.id,
  });
  assert.equal(humanVisibleFiles[0].contentText, updated.contentText);

  await markDraftPublished({
    store: store as never,
    now,
    idGenerator,
    ownerId: "human-author",
    skillId: humanCreated.skill.skillId,
    versionId: humanCreated.version.id,
  });

  const publishedSkillFile = Object.values(store.rows.skillFiles).find(
    (file) => file.versionId === humanCreated.version.id && file.path === "SKILL.md",
  );
  const skillUserInstructions = appendSkillfullyManagedBlock(String(publishedSkillFile?.contentText ?? ""), {
    skillId: humanCreated.skill.skillId,
    baseUrl: "https://www.skillfully.sh",
  });
  assert.match(skillUserInstructions, /POST https:\/\/www\.skillfully\.sh\/feedback\/sk_threeway/);
  assert.match(skillUserInstructions, /api\/public\/skills\/sk_threeway\/manifest/);

  await store.transact([
    store.create("feedback", "feedback-1", {
      ownerId: "human-author",
      skillId: humanCreated.skill.skillId,
      rating: "positive",
      feedback: "The skill user submitted feedback after running the published instructions.",
      createdAt: 1700000000100,
    }),
  ]);

  const feedback = await listFeedbackForSkill({
    token: token.token,
    skillId: humanCreated.skill.skillId,
    sort: "desc",
    limit: "10",
  }, {
    now,
    db: store as never,
  });
  assert.equal(feedback.items.length, 1);
  assert.equal(feedback.items[0].rating, "positive");
});
