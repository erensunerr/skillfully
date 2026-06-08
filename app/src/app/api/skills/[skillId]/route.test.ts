import assert from "node:assert/strict";
import test from "node:test";

import { setSkillInstallRouteTestDeps } from "./install-helpers";
import { GET as GET_FILE } from "./files/[...path]/route";
import { POST as POST_INSTALL } from "./install/route";
import { GET as GET_MANIFEST } from "./manifest/route";
import { GET as GET_PUBLIC_COMPAT_MANIFEST } from "../../public/skills/[skillId]/manifest/route";

type Row = Record<string, unknown>;

class InMemoryInstallStore {
  rows: Record<string, Record<string, Row>> = {
    skills: {
      public_skill: {
        ownerId: "owner-1",
        name: "Public Skill",
        skillId: "sk_public",
        slug: "public-skill",
        status: "published",
        visibility: "public",
        sourceMode: "managed",
        currentDraftVersionId: "draft-public",
        publishedVersionId: "published-public",
        createdAt: 1,
        updatedAt: 1,
      },
      private_skill: {
        ownerId: "owner-1",
        name: "Private Skill",
        skillId: "sk_private",
        slug: "private-skill",
        status: "published",
        visibility: "private",
        sourceMode: "managed",
        currentDraftVersionId: "draft-private",
        publishedVersionId: "published-private",
        createdAt: 1,
        updatedAt: 1,
      },
      private_link_skill: {
        ownerId: "owner-1",
        name: "Private Link Skill",
        skillId: "sk_private_link",
        slug: "private-link-skill",
        status: "published",
        visibility: "private",
        anyoneWithLinkCanUse: true,
        linkUseToken: "slt_private_link",
        sourceMode: "managed",
        currentDraftVersionId: "draft-private-link",
        publishedVersionId: "published-private-link",
        createdAt: 1,
        updatedAt: 1,
      },
    },
    skillVersions: {
      "published-public": {
        ownerId: "owner-1",
        skillId: "sk_public",
        version: "1",
        versionNumber: 1,
        status: "published",
        createdAt: 1,
        updatedAt: 1,
        publishedAt: 1,
      },
      "published-private": {
        ownerId: "owner-1",
        skillId: "sk_private",
        version: "1",
        versionNumber: 1,
        status: "published",
        createdAt: 1,
        updatedAt: 1,
        publishedAt: 1,
      },
      "published-private-link": {
        ownerId: "owner-1",
        skillId: "sk_private_link",
        version: "1",
        versionNumber: 1,
        status: "published",
        createdAt: 1,
        updatedAt: 1,
        publishedAt: 1,
      },
    },
    skillFiles: {
      "file-public": {
        ownerId: "owner-1",
        skillId: "sk_public",
        versionId: "published-public",
        fileKey: "sk_public:published-public:SKILL.md",
        path: "SKILL.md",
        kind: "markdown",
        mimeType: "text/markdown",
        contentText: "---\nname: public-skill\n---\n",
        createdAt: 1,
        updatedAt: 1,
      },
      "file-private": {
        ownerId: "owner-1",
        skillId: "sk_private",
        versionId: "published-private",
        fileKey: "sk_private:published-private:SKILL.md",
        path: "SKILL.md",
        kind: "markdown",
        mimeType: "text/markdown",
        contentText: "---\nname: private-skill\n---\n",
        createdAt: 1,
        updatedAt: 1,
      },
      "file-private-link": {
        ownerId: "owner-1",
        skillId: "sk_private_link",
        versionId: "published-private-link",
        fileKey: "sk_private_link:published-private-link:SKILL.md",
        path: "SKILL.md",
        kind: "markdown",
        mimeType: "text/markdown",
        contentText: "---\nname: private-link-skill\n---\n",
        createdAt: 1,
        updatedAt: 1,
      },
    },
    skillAccessGrants: {
      "grant-use": {
        ownerId: "owner-1",
        skillId: "sk_private",
        granteeEmail: "use@example.com",
        granteeUserId: "use-user",
        permission: "use",
        status: "active",
        createdByUserId: "owner-1",
        createdAt: 1,
        updatedAt: 1,
      },
      "grant-edit": {
        ownerId: "owner-1",
        skillId: "sk_private",
        granteeEmail: "edit@example.com",
        granteeUserId: "edit-user",
        permission: "edit",
        status: "active",
        createdByUserId: "owner-1",
        createdAt: 1,
        updatedAt: 1,
      },
    },
  };

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

  create(entity: string, id: string, values: Row) {
    return { entity, id, values };
  }

  update(entity: string, id: string, values: Row) {
    return { entity, id, values };
  }

  async transact() {
    return;
  }
}

function installContext(skillId: string, path: string[] = []) {
  return {
    params: Promise.resolve({ skillId, path }),
  };
}

function useInstallStore() {
  const store = new InMemoryInstallStore();
  const usageEvents: Array<Record<string, unknown>> = [];
  setSkillInstallRouteTestDeps({
    store,
    resolveBearerUser: async (token) => {
      if (token === "use-token") return { id: "use-user", email: "use@example.com" };
      if (token === "edit-token") return { id: "edit-user", email: "edit@example.com" };
      if (token === "none-token") return { id: "none-user", email: "none@example.com" };
      return null;
    },
    recordUsage: async (event) => {
      usageEvents.push(event);
    },
  });
  return { usageEvents };
}

test.afterEach(() => {
  setSkillInstallRouteTestDeps(null);
});

test("public manifest serves without auth", async () => {
  useInstallStore();

  const response = await GET_MANIFEST(
    new Request("https://www.skillfully.sh/api/skills/sk_public/manifest") as never,
    installContext("sk_public"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.skill_id, "sk_public");
  assert.equal(body.manifest_url, "https://www.skillfully.sh/api/skills/sk_public/manifest");
});

test("private manifest without auth returns 401", async () => {
  useInstallStore();

  const response = await GET_MANIFEST(
    new Request("https://www.skillfully.sh/api/skills/sk_private/manifest") as never,
    installContext("sk_private"),
  );
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.match(String(body.error), /authorization/i);
});

test("private link-use skill without share token requires auth", async () => {
  useInstallStore();

  const response = await GET_MANIFEST(
    new Request("https://www.skillfully.sh/api/skills/sk_private_link/manifest") as never,
    installContext("sk_private_link"),
  );
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.match(String(body.error), /authorization/i);
});

test("private link-use skill with wrong share token requires auth", async () => {
  useInstallStore();

  const response = await GET_MANIFEST(
    new Request("https://www.skillfully.sh/api/skills/sk_private_link/manifest?share=slt_wrong") as never,
    installContext("sk_private_link"),
  );
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.match(String(body.error), /authorization/i);
});

test("private link-use skill serves manifest, file, and install with matching share token", async () => {
  const { usageEvents } = useInstallStore();

  const manifestResponse = await GET_MANIFEST(
    new Request("https://www.skillfully.sh/api/skills/sk_private_link/manifest?share=slt_private_link") as never,
    installContext("sk_private_link"),
  );
  const manifestBody = await manifestResponse.json();
  const fileResponse = await GET_FILE(
    new Request("https://www.skillfully.sh/api/skills/sk_private_link/files/SKILL.md?share=slt_private_link") as never,
    installContext("sk_private_link", ["SKILL.md"]),
  );
  const fileText = await fileResponse.text();
  const installResponse = await POST_INSTALL(
    new Request("https://www.skillfully.sh/api/skills/sk_private_link/install?share=slt_private_link", {
      method: "POST",
    }) as never,
    installContext("sk_private_link"),
  );
  const installBody = await installResponse.json();

  assert.equal(manifestResponse.status, 200);
  assert.equal(manifestBody.skill_id, "sk_private_link");
  assert.equal(
    manifestBody.manifest_url,
    "https://www.skillfully.sh/api/skills/sk_private_link/manifest?share=slt_private_link",
  );
  assert.equal(fileResponse.status, 200);
  assert.match(fileText, /name: private-link-skill/);
  assert.match(fileText, /api\/skills\/sk_private_link\/manifest\?share=slt_private_link/);
  assert.equal(installResponse.status, 200);
  assert.equal(
    installBody.manifest_url,
    "https://www.skillfully.sh/api/skills/sk_private_link/manifest?share=slt_private_link",
  );
  assert.deepEqual(usageEvents.map((event) => event.eventKind), [
    "manifest_checked",
    "file_loaded",
    "skill_installed",
  ]);
});

test("private manifest with auth but no access returns 404", async () => {
  useInstallStore();

  const response = await GET_MANIFEST(
    new Request("https://www.skillfully.sh/api/skills/sk_private/manifest", {
      headers: { authorization: "Bearer none-token" },
    }) as never,
    installContext("sk_private"),
  );
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, "skill not found");
});

test("private manifest with use access serves latest release", async () => {
  useInstallStore();

  const response = await GET_MANIFEST(
    new Request("https://www.skillfully.sh/api/skills/sk_private/manifest", {
      headers: { authorization: "Bearer use-token" },
    }) as never,
    installContext("sk_private"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.skill_id, "sk_private");
  assert.equal(body.version, "1");
});

test("private file route with edit access serves file", async () => {
  useInstallStore();

  const response = await GET_FILE(
    new Request("https://www.skillfully.sh/api/skills/sk_private/files/SKILL.md", {
      headers: { authorization: "Bearer edit-token" },
    }) as never,
    installContext("sk_private", ["SKILL.md"]),
  );
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.match(text, /name: private-skill/);
  assert.match(text, /api\/skills\/sk_private\/manifest/);
});

test("install route records usage for private use access", async () => {
  const { usageEvents } = useInstallStore();

  const response = await POST_INSTALL(
    new Request("https://www.skillfully.sh/api/skills/sk_private/install", {
      method: "POST",
      headers: { authorization: "Bearer use-token" },
    }) as never,
    installContext("sk_private"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.manifest_url, "https://www.skillfully.sh/api/skills/sk_private/manifest");
  assert.equal(usageEvents[0].eventKind, "skill_installed");
});

test("public compatibility route refuses private skills", async () => {
  useInstallStore();

  const response = await GET_PUBLIC_COMPAT_MANIFEST(
    new Request("https://www.skillfully.sh/api/public/skills/sk_private/manifest", {
      headers: { authorization: "Bearer use-token" },
    }) as never,
    installContext("sk_private"),
  );
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, "skill not found");
});

test("public compatibility route refuses private link-use skills", async () => {
  useInstallStore();

  const response = await GET_PUBLIC_COMPAT_MANIFEST(
    new Request("https://www.skillfully.sh/api/public/skills/sk_private_link/manifest") as never,
    installContext("sk_private_link"),
  );
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, "skill not found");
});
