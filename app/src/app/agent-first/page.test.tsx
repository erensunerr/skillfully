import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import AgentFirstPage from "./page";

test("agent-first landing renders a quiz-only first step with a direct learn path", () => {
  const html = renderToStaticMarkup(<AgentFirstPage />);

  assert.match(html, /Skillfully helps you make better agent skills/i);
  assert.match(html, /Do you know what an agent skill is\?/i);
  assert.doesNotMatch(html, /Do you have an agent you can text right now\?/i);
  assert.match(html, /Step 1 of 2/i);
  assert.match(html, /No, learn first/i);
  assert.match(html, /\/guide\/start-with-agent-skills/);
  assert.doesNotMatch(html, /SKILLS GUIDE/i);
  assert.doesNotMatch(html, /BLOG/i);
  assert.doesNotMatch(html, /Open guided setup/i);
  assert.doesNotMatch(html, /Yes, copy prompt/i);
  assert.doesNotMatch(html, /See regular landing page/i);
});
