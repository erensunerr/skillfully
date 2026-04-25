import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("blog index renders published articles", async () => {
  Object.assign(globalThis, { React });
  const { default: BlogPage } = await import("./page");
  const html = renderToStaticMarkup(<BlogPage />);
  const removedRoutePattern = new RegExp("/" + "do" + "cs");

  assert.match(html, /Skillfully Blog/);
  assert.match(html, /How to write better agent skills/);
  assert.match(html, /Measuring agent skill quality/);
  assert.match(html, /\/blog\/how-to-write-better-agent-skills/);
  assert.match(html, /\/guide/);
  assert.doesNotMatch(html, removedRoutePattern);
});
