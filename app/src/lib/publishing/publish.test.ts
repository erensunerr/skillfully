import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGitHubWritePlan,
  createGitHubAppAdapter,
  resolveGitHubPublishTarget,
} from "./adapters/github-app";
import { createPublishAdaptersForContext } from "./adapters/for-context";
import { createManualDirectoryAdapter } from "./adapters/manual-directory";
import { createSkillfullyAdapter } from "./adapters/skillfully";
import { publishSkillVersion } from "./publish";
import type { PublishAdapter, PublishContext } from "./types";

const defaultRepo = {
  repoFullName: "erensunerr/skillfully-skills",
  installationId: "internal-installation",
};

test("createPublishAdaptersForContext keeps Skillfully-managed skills out of GitHub", () => {
  const adapters = createPublishAdaptersForContext({
    skill: {
      skillId: "sk_demo",
      slug: "demo-skill",
      name: "demo-skill",
      visibility: "public",
      sourceMode: "managed",
      originalSkillPath: null,
    },
  });

  assert.deepEqual(
    adapters.map((adapter) => adapter.kind),
    ["skillfully", "lobehub", "clawhub", "hermes"],
  );
});

test("createPublishAdaptersForContext routes GitHub-managed skills to GitHub", () => {
  const adapters = createPublishAdaptersForContext({
    skill: {
      skillId: "sk_imported",
      slug: "code-review",
      name: "code-review",
      visibility: "public",
      sourceMode: "github_import",
      originalSkillPath: ".agents/skills/code-review",
    },
  });

  assert.deepEqual(
    adapters.map((adapter) => adapter.kind),
    ["github", "lobehub", "clawhub", "hermes"],
  );
});

test("createPublishAdaptersForContext publishes private skills through Skillfully only", () => {
  const adapters = createPublishAdaptersForContext({
    skill: {
      skillId: "sk_private",
      slug: "private-skill",
      name: "private-skill",
      visibility: "private",
      sourceMode: "github_import",
      originalSkillPath: ".agents/skills/private-skill",
    },
  });

  assert.deepEqual(
    adapters.map((adapter) => adapter.kind),
    ["skillfully"],
  );
});

test("resolveGitHubPublishTarget keeps imported skills in their source repo and path", () => {
  const target = resolveGitHubPublishTarget({
    defaultRepo,
    skill: {
      skillId: "sk_imported",
      slug: "original-skill",
      sourceMode: "github_import",
      originalSkillPath: "skills/Original Skill",
    },
    configuredTarget: {
      repoFullName: "acme/agent-skills",
      installationId: "user-installation",
      skillRoot: "skills/Original Skill",
    },
  });

  assert.equal(target.repoFullName, "acme/agent-skills");
  assert.equal(target.installationId, "user-installation");
  assert.equal(target.skillRoot, "skills/Original Skill");
});

test("GitHub adapter rejects imported skills without a source target", async () => {
  const adapter = createGitHubAppAdapter({
    appId: "1",
    privateKey: "placeholder",
    defaultRepo,
  });
  const issues = await adapter.validate({
    skill: {
      skillId: "sk_imported",
      slug: "code-review",
      name: "code-review",
      sourceMode: "github_import",
      originalSkillPath: ".agents/skills/code-review",
    },
    version: { id: "version-1", version: "1.0.0" },
    files: [],
    githubTarget: null,
  });

  assert.match(issues.map((issue) => issue.message).join("\n"), /GitHub publish target is not configured/);
});

test("GitHub adapter rejects imported skills without the source installation", async () => {
  const adapter = createGitHubAppAdapter({
    appId: "1",
    privateKey: "placeholder",
    defaultRepo,
  });
  const issues = await adapter.validate({
    skill: {
      skillId: "sk_imported",
      slug: "code-review",
      name: "code-review",
      sourceMode: "github_import",
      originalSkillPath: ".agents/skills/code-review",
    },
    version: { id: "version-1", version: "1.0.0" },
    files: [],
    githubTarget: {
      repoFullName: "octocat/Hello-World",
      installationId: "",
      skillRoot: ".agents/skills/code-review",
    },
  });

  assert.match(
    issues.map((issue) => issue.message).join("\n"),
    /GitHub App installation is not configured for the source repository/,
  );
});

test("skillfully adapter marks Skillfully-hosted publishing as published", async () => {
  const result = await createSkillfullyAdapter().submit({
    skill: { skillId: "sk_demo", slug: "demo-skill", name: "demo-skill", sourceMode: "managed" },
    version: { id: "version-1", version: "1.0.0" },
    files: [{ path: "SKILL.md", contentText: "# demo", kind: "markdown" }],
  } as PublishContext);

  assert.equal(result.targetKind, "skillfully");
  assert.equal(result.status, "published");
  assert.equal(result.details?.storage, "skillfully");
});

test("buildGitHubWritePlan writes skill files under the resolved skill root", () => {
  const plan = buildGitHubWritePlan({
    repoFullName: "erensunerr/skillfully-skills",
    skillRoot: "skills/demo-skill",
    baseBranch: "main",
    skillSlug: "demo-skill",
    version: "1.0.0",
    files: [
      { path: "SKILL.md", contentText: "# demo", kind: "markdown" },
      { path: "examples/basic.md", contentText: "Use it.", kind: "markdown" },
    ],
  });

  assert.match(plan.branchName, /^skillfully\/demo-skill\/1-0-0-/);
  assert.equal(plan.baseBranch, "main");
  assert.deepEqual(
    plan.files.map((file) => file.path),
    ["skills/demo-skill/SKILL.md", "skills/demo-skill/examples/basic.md"],
  );
  assert.match(plan.pullRequestTitle, /Publish demo-skill v1\.0\.0/);
});

test("buildGitHubWritePlan preserves dot-prefixed imported skill roots", () => {
  const plan = buildGitHubWritePlan({
    repoFullName: "acme/agent-skills",
    skillRoot: ".agents/skills/code-review",
    baseBranch: "main",
    skillSlug: "code-review",
    version: "1.0.0",
    files: [
      { path: "SKILL.md", contentText: "# code-review", kind: "markdown" },
      { path: "scripts/check.sh", contentText: "echo ok", kind: "text" },
    ],
  });

  assert.deepEqual(
    plan.files.map((file) => file.path),
    [".agents/skills/code-review/SKILL.md", ".agents/skills/code-review/scripts/check.sh"],
  );
});

test("manual directory adapters produce submission packets instead of pretending to auto-submit", async () => {
  const adapter = createManualDirectoryAdapter("lobehub");
  const result = await adapter.submit({
    skill: { skillId: "sk_demo", slug: "demo-skill", name: "demo-skill" },
    version: { id: "version-1", version: "1.0.0" },
    files: [{ path: "SKILL.md", contentText: "# demo", kind: "markdown" }],
  } as PublishContext);

  assert.equal(result.status, "manual_ready");
  assert.equal(result.targetKind, "lobehub");
  const packet = result.packet as { files: Array<{ path: string }> };
  assert.equal(packet.files[0].path, "SKILL.md");
});

test("publishSkillVersion records each adapter result and returns failed GitHub configuration clearly", async () => {
  const recorded: Array<{ targetKind: string; status: string; error?: string }> = [];
  const adapters: PublishAdapter[] = [
    {
      kind: "github",
      async validate() {
        return [{ severity: "error", message: "GitHub App installation is not configured" }];
      },
      async submit() {
        throw new Error("should not submit when validation fails");
      },
    },
    createManualDirectoryAdapter("hermes"),
  ];

  const result = await publishSkillVersion({
    context: {
      skill: { skillId: "sk_demo", slug: "demo-skill", name: "demo-skill" },
      version: { id: "version-1", version: "1.0.0" },
      files: [{ path: "SKILL.md", contentText: "# demo", kind: "markdown" }],
    } as PublishContext,
    adapters,
    recordResult: async (entry) => {
      recorded.push(entry);
    },
  });

  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].status, "failed");
  assert.match(result.results[0].error ?? "", /GitHub App installation is not configured/);
  assert.equal(result.results[1].status, "manual_ready");
  assert.deepEqual(
    recorded.map((entry) => [entry.targetKind, entry.status]),
    [
      ["github", "failed"],
      ["hermes", "manual_ready"],
    ],
  );
});
