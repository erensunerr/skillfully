import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGitHubWritePlan,
  resolveGitHubPublishTarget,
} from "./adapters/github-app";
import { createManualDirectoryAdapter } from "./adapters/manual-directory";
import { publishSkillVersion } from "./publish";
import type { PublishAdapter, PublishContext } from "./types";

const defaultRepo = {
  repoFullName: "erensunerr/skillfully-skills",
  installationId: "internal-installation",
};

test("resolveGitHubPublishTarget uses the Skillfully-owned repo for managed skills", () => {
  const target = resolveGitHubPublishTarget({
    defaultRepo,
    skill: {
      skillId: "sk_demo",
      slug: "demo-skill",
      sourceMode: "managed",
      originalSkillPath: null,
    },
    configuredTarget: null,
  });

  assert.equal(target.repoFullName, "erensunerr/skillfully-skills");
  assert.equal(target.installationId, "internal-installation");
  assert.equal(target.skillRoot, "skills/demo-skill");
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
