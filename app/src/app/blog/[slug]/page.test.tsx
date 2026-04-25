import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("blog article route renders a published article", async () => {
  Object.assign(globalThis, { React });
  const { default: BlogArticlePage } = await import("./page");
  const element = await BlogArticlePage({
    params: Promise.resolve({ slug: "how-to-write-better-agent-skills" }),
  });
  const html = renderToStaticMarkup(element);
  const removedRoutePattern = new RegExp("/" + "do" + "cs");

  assert.match(html, /How to write better agent skills/);
  assert.match(html, /Table of Contents/);
  assert.match(html, /Instrument the outcome/);
  assert.match(html, /\/blog/);
  assert.match(html, /\/guide/);
  assert.doesNotMatch(html, removedRoutePattern);
});
