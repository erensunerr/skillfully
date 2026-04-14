import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("landing page renders the refreshed editorial messaging", async () => {
  Object.assign(globalThis, { React });
  const { default: LandingPage } = await import("./page");
  const html = renderToStaticMarkup(<LandingPage />);

  assert.match(html, /Know which of your/);
  assert.match(html, /AGENT SKILLS/);
  assert.match(html, /Three Steps/);
  assert.match(html, /Ready to stop guessing\?/);
  assert.match(html, /\/dashboard/);
});
