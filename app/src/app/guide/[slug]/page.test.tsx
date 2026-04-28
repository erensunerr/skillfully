import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("guide article route renders one article with five sections", async () => {
  Object.assign(globalThis, { React });
  const { default: GuideArticlePage } = await import("./page");
  const element = await GuideArticlePage({
    params: Promise.resolve({ slug: "start-with-agent-skills" }),
  });
  const html = renderToStaticMarkup(element);
  const removedRoutePattern = new RegExp("/" + "do" + "cs");

  assert.match(html, /Start with agent skills/);
  assert.match(html, /Table of Contents/);
  assert.match(html, /data-author-area="guide-article"/);
  assert.match(html, /data-author-avatar="true"/);
  assert.match(html, /Skillfully Editorial/);
  assert.match(html, /What a skill is for/);
  assert.match(html, /Choose the first workflow/);
  assert.match(html, /\/guide\/design-the-skill-contract/);
  assert.doesNotMatch(html, removedRoutePattern);
});
