import assert from "node:assert/strict";
import test from "node:test";

import { setAgentAuthorTestResolver } from "@/lib/agent-author-api";
import { setSkillAuthoringTestStore } from "@/lib/skills/authoring-access";
import { GET as GET_ANALYTICS } from "./analytics/route";
import { PATCH as PATCH_FILE } from "./files/[fileId]/route";
import { GET as GET_FILES } from "./files/route";

type Row = Record<string, unknown>;
type Op =
  | { kind: "create"; entity: string; id: string; values: Row }
  | { kind: "update"; entity: string; id: string; values: Row }
  | { kind: "delete"; entity: string; id: string };

class InMemoryAuthoringStore {
  rows: Record<string, Record<string, Row>> = {
    apiUsers: {
      editor: { email: "editor@example.com", createdAt: 1 },
      user: { email: "user@example.com", createdAt: 1 },
    },
    skills: {
      skill: {
        ownerId: "owner",
        name: "Shared Draft",
        skillId: "sk_shared",
        slug: "shared-draft",
        status: "published",
        visibility: "private",
        sourceMode: "managed",
        currentDraftVersionId: "draft-1",
        publishedVersionId: "published-1",
        createdAt: 1,
        updatedAt: 1,
      },
    },
    skillVersions: {
      "draft-1": {
        ownerId: "owner",
        skillId: "sk_shared",
        version: "2",
        versionNumber: 2,
        status: "draft",
        createdAt: 1,
        updatedAt: 1,
      },
    },
    skillFiles: {
      "file-1": {
        ownerId: "owner",
        skillId: "sk_shared",
        versionId: "draft-1",
        fileKey: "sk_shared:draft-1:SKILL.md",
        path: "SKILL.md",
        kind: "markdown",
        mimeType: "text/markdown",
        contentText: "# Before",
        createdAt: 1,
        updatedAt: 1,
      },
    },
    skillAccessGrants: {
      "grant-editor": {
        ownerId: "owner",
        skillId: "sk_shared",
        granteeEmail: "editor@example.com",
        granteeUserId: "editor",
        permission: "edit",
        status: "active",
        createdByUserId: "owner",
        createdAt: 1,
        updatedAt: 1,
      },
      "grant-user": {
        ownerId: "owner",
        skillId: "sk_shared",
        granteeEmail: "user@example.com",
        granteeUserId: "user",
        permission: "use",
        status: "active",
        createdByUserId: "owner",
        createdAt: 1,
        updatedAt: 1,
      },
    },
    feedback: {
      "feedback-1": {
        ownerId: "owner",
        skillId: "sk_shared",
        rating: "positive",
        feedback: "Worked well.",
        createdAt: 100,
      },
    },
    skillUsageEvents: {},
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

function context(fileId = "file-1") {
  return {
    params: Promise.resolve({ skillId: "sk_shared", fileId }),
  };
}

function agentRequest(token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  return new Request("https://www.skillfully.sh/api/agent/skills/sk_shared/files", {
    ...init,
    headers,
  }) as never;
}

function useAuthoringStore() {
  const store = new InMemoryAuthoringStore();
  setSkillAuthoringTestStore(store);
  setAgentAuthorTestResolver(async (request) => {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (token === "editor-token") return { ownerId: "editor", email: "editor@example.com" };
    if (token === "use-token") return { ownerId: "user", email: "user@example.com" };
    return null;
  });
  return store;
}

test.afterEach(() => {
  setSkillAuthoringTestStore(null);
  setAgentAuthorTestResolver(null);
});

test("edit collaborator can load draft files", async () => {
  useAuthoringStore();

  const response = await GET_FILES(agentRequest("editor-token"), context());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.files[0].contentText, "# Before");
});

test("edit collaborator can update draft files", async () => {
  const store = useAuthoringStore();
  const contentText = [
    "---",
    "name: shared-draft",
    'description: "Shared draft instructions."',
    "---",
    "",
    "# After",
  ].join("\n");

  const response = await PATCH_FILE(
    agentRequest("editor-token", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content_text: contentText }),
    }),
    context(),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.file.contentText, contentText);
  assert.equal(store.rows.skillFiles["file-1"].contentText, contentText);
});

test("use collaborator cannot load draft files", async () => {
  useAuthoringStore();

  const response = await GET_FILES(agentRequest("use-token"), context());
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, "skill not found");
});

test("edit collaborator can view analytics", async () => {
  useAuthoringStore();

  const response = await GET_ANALYTICS(agentRequest("editor-token"), context());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.skill_id, "sk_shared");
  assert.equal(body.feedback.total, 1);
});
