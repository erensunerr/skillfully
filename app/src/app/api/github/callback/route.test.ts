import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import { createGitHubInstallState } from "@/lib/github-install-state";
import { GET } from "./route";

test("github callback resolves the owner from signed state instead of requiring dashboard auth headers", async () => {
  const previousStateSecret = process.env.GITHUB_APP_STATE_SECRET;
  const previousAppId = process.env.GITHUB_APP_ID;
  const previousPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  process.env.GITHUB_APP_STATE_SECRET = "state-secret";
  delete process.env.GITHUB_APP_ID;
  delete process.env.GITHUB_APP_PRIVATE_KEY;

  try {
    const state = createGitHubInstallState({ ownerId: "owner-a" });
    const response = await GET(
      new NextRequest(`http://localhost:3000/api/github/callback?installation_id=123&state=${encodeURIComponent(state)}`, {
        method: "GET",
      }),
    );

    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "http://localhost:3000/dashboard?github=not_configured");
  } finally {
    if (previousStateSecret === undefined) {
      delete process.env.GITHUB_APP_STATE_SECRET;
    } else {
      process.env.GITHUB_APP_STATE_SECRET = previousStateSecret;
    }
    if (previousAppId === undefined) {
      delete process.env.GITHUB_APP_ID;
    } else {
      process.env.GITHUB_APP_ID = previousAppId;
    }
    if (previousPrivateKey === undefined) {
      delete process.env.GITHUB_APP_PRIVATE_KEY;
    } else {
      process.env.GITHUB_APP_PRIVATE_KEY = previousPrivateKey;
    }
  }
});
