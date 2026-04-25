import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("docs page renders the agent skill guide", async () => {
  Object.assign(globalThis, { React });
  const { default: DocsPage } = await import("./page");
  const html = renderToStaticMarkup(<DocsPage />);

  assert.match(html, /The Agent Skills Guide/);
  assert.match(html, /Intro/);
  assert.match(html, /Create/);
  assert.match(html, /Install/);
  assert.match(html, /Run/);
  assert.match(html, /Read Feedback/);
  assert.match(html, /Improve/);
  assert.match(html, /Table of Contents/);
  assert.match(html, /Next up: How to write better agent skills/);
  assert.match(html, /\/blog\/how-to-write-better-agent-skills/);
  assert.match(html, /\/dashboard/);
});
