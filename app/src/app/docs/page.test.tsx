import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("docs page renders the agent skill guide", async () => {
  Object.assign(globalThis, { React });
  const { default: DocsPage } = await import("./page");
  const html = renderToStaticMarkup(<DocsPage />);

  assert.match(html, /Agent skills guide/);
  assert.match(html, /Create a skill/);
  assert.match(html, /Paste the snippet/);
  assert.match(html, /Collect feedback/);
  assert.match(html, /\/dashboard/);
});
