import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import AgentFirstPage from "./page";

test("agent-first landing renders the stripped-down first question without card chrome or old explainer copy", () => {
  const html = renderToStaticMarkup(<AgentFirstPage />);

  assert.match(html, /Skillfully helps you make better agent skills/i);
  assert.match(html, /Do you know what an agent skill is\?/i);
  assert.match(html, /Do you have an agent that you can text right now\?/i);
  assert.match(html, /Step 1 of 2/i);
  assert.match(html, /No, learn first/i);
  assert.match(html, /\/guide\/start-with-agent-skills/);
  assert.match(html, /absolute inset-y-0 left-0 flex w-full transition-transform duration-500 ease-out translate-x-0/i);
  assert.match(html, /min-w-full/i);
  assert.doesNotMatch(html, /Two questions\. Then we point you to the right next step\./i);
  assert.doesNotMatch(html, /A reusable instruction set that helps an agent do one job well, consistently\./i);
  assert.doesNotMatch(html, /border border-\[var\(--ink\)\] bg-\[var\(--paper\)\]/i);
  assert.doesNotMatch(html, /SKILLS GUIDE/i);
  assert.doesNotMatch(html, /BLOG/i);
  assert.doesNotMatch(html, /See regular landing page/i);
});
