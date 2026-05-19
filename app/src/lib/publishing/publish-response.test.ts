import assert from "node:assert/strict";
import test from "node:test";

import { buildPublishResponse } from "./publish-response";
import type { PublishContext } from "./types";

const importedContext = {
  skill: {
    skillId: "sk_imported",
    slug: "code-review",
    name: "code-review",
    sourceMode: "github_import",
    originalSkillPath: ".agents/skills/code-review",
  },
  version: {
    id: "version-1",
    version: "1.0.0",
  },
  files: [{ path: "SKILL.md", kind: "markdown", contentText: "# code-review" }],
  defaultGitHubRepo: {
    repoFullName: "erensunerr/skillfully-skills",
    installationId: "internal-installation",
  },
  githubTarget: {
    repoFullName: "octocat/Hello-World",
    installationId: "user-installation",
    skillRoot: ".agents/skills/code-review",
    autoMerge: false,
  },
} satisfies PublishContext;

test("buildPublishResponse tells GitHub-managed publishers to merge the PR before install", () => {
  const response = buildPublishResponse({
    context: importedContext,
    result: {
      results: [
        {
          targetKind: "github",
          status: "submitted",
          url: "https://github.com/octocat/Hello-World/pull/42",
        },
      ],
    },
  });

  assert.equal(response.next_action?.type, "merge_github_pull_request");
  assert.equal(response.next_action?.pull_request_url, "https://github.com/octocat/Hello-World/pull/42");
  assert.match(response.next_action?.message ?? "", /Merge this GitHub pull request/i);
  assert.match(response.next_action?.install_prompt ?? "", /Install code-review from octocat\/Hello-World on github/);
  assert.match(response.next_action?.install_prompt ?? "", /Skill path: \.agents\/skills\/code-review/);
  assert.deepEqual(response.next_action?.confirmation.success_events, ["skill_installed", "feedback_received"]);
});

test("buildPublishResponse sends Skillfully-managed publishers directly to Skillfully install", () => {
  const response = buildPublishResponse({
    context: {
      ...importedContext,
      defaultGitHubRepo: null,
      skill: {
        skillId: "sk_managed",
        slug: "release-check",
        name: "release-check",
        sourceMode: "managed",
        originalSkillPath: null,
      },
      githubTarget: null,
    },
    result: {
      results: [
        {
          targetKind: "skillfully",
          status: "published",
        },
      ],
    },
  });

  assert.equal(response.next_action?.type, "install_skill");
  assert.equal(response.next_action?.pull_request_url, undefined);
  assert.match(response.next_action?.install_prompt ?? "", /Install release-check from Skillfully/);
  assert.match(response.next_action?.install_prompt ?? "", /stored on Skillfully, not GitHub/);
  assert.doesNotMatch(response.next_action?.install_prompt ?? "", /on github|erensunerr\/skillfully-skills/i);
});
