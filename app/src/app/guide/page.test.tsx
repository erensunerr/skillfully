import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { guideArticles } from "@/content/guide";

test("guide index renders five guide articles", async () => {
  Object.assign(globalThis, { React });
  const { default: GuidePage } = await import("./page");
  const html = renderToStaticMarkup(<GuidePage />);
  const removedRoutePattern = new RegExp("/" + "do" + "cs");

  assert.equal(guideArticles.length, 5);
  assert.deepEqual(
    guideArticles.map((article) => article.sections.length),
    [5, 5, 5, 5, 5],
  );
  assert.match(html, /The Agent Skills Guide/);
  assert.match(html, /5 articles/);
  assert.match(html, /Start with agent skills/);
  assert.match(html, /Design the skill contract/);
  assert.match(html, /\/guide\/start-with-agent-skills/);
  assert.doesNotMatch(html, removedRoutePattern);
});
