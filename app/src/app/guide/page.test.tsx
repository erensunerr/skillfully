import assert from "node:assert/strict";
import test from "node:test";

import { guideArticles } from "@/content/guide";

test("guide route redirects to the first guide article", async () => {
  const { default: GuidePage } = await import("./page");

  assert.equal(guideArticles.length, 5);
  assert.deepEqual(
    guideArticles.map((article) => article.sections.length),
    [5, 5, 5, 5, 5],
  );
  assert.throws(
    () => GuidePage(),
    (error) =>
      error instanceof Error &&
      "digest" in error &&
      String(error.digest).includes("/guide/start-with-agent-skills"),
  );
});
