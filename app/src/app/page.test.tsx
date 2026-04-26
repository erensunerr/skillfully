import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("landing page renders the refreshed editorial messaging", async () => {
  Object.assign(globalThis, { React });
  const { default: LandingPage } = await import("./page");
  const html = renderToStaticMarkup(<LandingPage />);

  assert.match(html, /THE PLATFORM FOR BUILDING BETTER AGENT SKILLS/);
  assert.match(html, /AGENT SKILL QA AND ANALYTICS/);
  assert.match(html, /Agent skills are easy to publish\. Hard to improve\./);
  assert.match(html, /See which skills are actually being used/);
  assert.match(html, /Understand why agents fail/);
  assert.match(html, /A feedback loop for every agent skill/);
  assert.match(html, /Common questions/);
  assert.match(html, /Stop guessing how your agent skills perform/);
  assert.match(html, /\/dashboard/);
  assert.match(html, /\/guide/);
  assert.match(html, /\/blog/);
  assert.match(html, /data-magnetic-cursor-area="hero-illustration"/);
  assert.match(html, /data-magnetic-layer="center"/);
  assert.match(html, /data-magnetic-layer="geometry"/);
  assert.match(html, /data-magnetic-layer="background"/);
  assert.match(html, /data-dot-spotlight-area="footer-cta"/);
  assert.match(html, /data-dot-spotlight-layer="overlay"/);
  assert.doesNotMatch(html, new RegExp(`/${["do", "cs"].join("")}`));
});
