import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "./route";

test("github webhook rejects malformed signatures without throwing", async () => {
  const previousSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  process.env.GITHUB_APP_WEBHOOK_SECRET = "test-secret";

  try {
    const response = await POST(
      new Request("https://www.skillfully.sh/api/github/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "installation",
          "x-hub-signature-256": "sha256=bad",
        },
        body: JSON.stringify({ installation: { id: 1, account: { login: "bad" } } }),
      }) as never,
    );
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.deepEqual(body, { error: "invalid signature" });
  } finally {
    if (previousSecret === undefined) {
      delete process.env.GITHUB_APP_WEBHOOK_SECRET;
    } else {
      process.env.GITHUB_APP_WEBHOOK_SECRET = previousSecret;
    }
  }
});
