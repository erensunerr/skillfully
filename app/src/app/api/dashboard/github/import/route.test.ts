import assert from "node:assert/strict";
import test from "node:test";

import { cachedDiscoveryForSession, listInstallationRepositories } from "./route";

function repositoryPage(page: number, count: number) {
  return {
    repositories: Array.from({ length: count }, (_, index) => ({
      id: page * 1000 + index,
      full_name: `octocat/repo-${page}-${index}`,
      default_branch: "main",
    })),
  };
}

test("listInstallationRepositories stops at a bounded page cap and warns", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(JSON.stringify(repositoryPage(calls, 100)), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const result = await listInstallationRepositories("token");

    assert.equal(calls, 50);
    assert.equal(result.repositories.length, 5000);
    assert.deepEqual(result.warnings, [
      "GitHub repository listing stopped after 50 pages. Change repository access or contact support if expected repositories are missing.",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("cachedDiscoveryForSession serves stored candidates without rediscovery", () => {
  const cached = cachedDiscoveryForSession({
    id: "row-1",
    ownerId: "user-1",
    sessionId: "gis_session",
    installationId: "installation-1",
    status: "discovered",
    candidatesJson: [
      {
        id: "candidate-1",
        repositoryId: "1296269",
        repoFullName: "octocat/Hello-World",
        branch: "main",
        skillRoot: "skills/code-review",
        skillName: "code-review",
        status: "valid",
        files: [],
        oversizedFiles: [],
        totalSize: 0,
        totalSizeExceedsLimit: false,
      },
    ],
    warningsJson: ["octocat/Hello-World: repository tree is too large to check completely"],
    repositoriesChecked: 1,
  });

  assert.equal(cached?.repositoriesChecked, 1);
  assert.equal(cached?.candidates[0].skillName, "code-review");
  assert.deepEqual(cached?.warnings, ["octocat/Hello-World: repository tree is too large to check completely"]);
});
