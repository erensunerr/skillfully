import assert from "node:assert/strict";
import test from "node:test";

import { GET, POST } from "./route";

test("github install GET still rejects unauthenticated browser navigation", async () => {
  const response = await GET(
    new Request("http://localhost:3000/api/github/install", {
      method: "GET",
    }) as never,
  );
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.deepEqual(body, { error: "unauthorized" });
});

test("github install POST returns an install URL for authenticated local preview users", async () => {
  const previousAppId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
  const previousStateSecret = process.env.GITHUB_APP_STATE_SECRET;
  const previousInstallUrl = process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL;
  delete process.env.NEXT_PUBLIC_INSTANT_APP_ID;
  process.env.GITHUB_APP_STATE_SECRET = "state-secret";
  process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL = "https://github.com/apps/skillfully-local/installations/new";

  try {
    const response = await POST(
      new Request("http://localhost:3000/api/github/install", {
        method: "POST",
        headers: {
          "x-skillfully-preview-user-id": "local-preview-user",
          "x-skillfully-preview-user-email": "preview@skillfully.local",
        },
      }) as never,
    );
    const body = await response.json() as { install_url?: string };

    assert.equal(response.status, 200);
    assert.match(body.install_url ?? "", /^https:\/\/github\.com\/apps\/skillfully-local\/installations\/new\?state=/);
  } finally {
    if (previousAppId === undefined) {
      delete process.env.NEXT_PUBLIC_INSTANT_APP_ID;
    } else {
      process.env.NEXT_PUBLIC_INSTANT_APP_ID = previousAppId;
    }
    if (previousStateSecret === undefined) {
      delete process.env.GITHUB_APP_STATE_SECRET;
    } else {
      process.env.GITHUB_APP_STATE_SECRET = previousStateSecret;
    }
    if (previousInstallUrl === undefined) {
      delete process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL;
    } else {
      process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL = previousInstallUrl;
    }
  }
});
