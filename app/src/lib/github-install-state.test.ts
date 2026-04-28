import assert from "node:assert/strict";
import test from "node:test";

import { createGitHubInstallState, verifyGitHubInstallState } from "./github-install-state";

test("GitHub install state is owner-scoped, signed, and expiring", () => {
  const previousStateSecret = process.env.GITHUB_APP_STATE_SECRET;
  const previousWebhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  const previousAdminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
  process.env.GITHUB_APP_STATE_SECRET = "state-secret";
  delete process.env.GITHUB_APP_WEBHOOK_SECRET;
  delete process.env.INSTANT_APP_ADMIN_TOKEN;

  try {
    const state = createGitHubInstallState({ ownerId: "owner-a", now: 1_700_000_000_000 });

    assert.equal(
      verifyGitHubInstallState({ state, ownerId: "owner-a", now: 1_700_000_100_000 }),
      true,
    );
    assert.equal(
      verifyGitHubInstallState({ state, ownerId: "owner-b", now: 1_700_000_100_000 }),
      false,
    );
    assert.equal(
      verifyGitHubInstallState({ state: `${state}x`, ownerId: "owner-a", now: 1_700_000_100_000 }),
      false,
    );
    assert.equal(
      verifyGitHubInstallState({ state, ownerId: "owner-a", now: 1_700_001_000_001 }),
      false,
    );
  } finally {
    if (previousStateSecret === undefined) {
      delete process.env.GITHUB_APP_STATE_SECRET;
    } else {
      process.env.GITHUB_APP_STATE_SECRET = previousStateSecret;
    }
    if (previousWebhookSecret === undefined) {
      delete process.env.GITHUB_APP_WEBHOOK_SECRET;
    } else {
      process.env.GITHUB_APP_WEBHOOK_SECRET = previousWebhookSecret;
    }
    if (previousAdminToken === undefined) {
      delete process.env.INSTANT_APP_ADMIN_TOKEN;
    } else {
      process.env.INSTANT_APP_ADMIN_TOKEN = previousAdminToken;
    }
  }
});
