import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import AgentFirstPage from "./page";

test("agent-first landing renders the quiz and guided setup CTAs", () => {
  const html = renderToStaticMarkup(<AgentFirstPage />);

  assert.match(html, /Skillfully helps you make better agent skills/i);
  assert.match(html, /Do you know what an agent skill is\?/i);
  assert.match(html, /Do you have an agent you can text right now\?/i);
  assert.match(html, /Open guided setup/i);
  assert.match(html, /Yes, copy agent prompt/i);
  assert.match(html, /\/guide\/start-with-agent-skills/);
  assert.match(html, /\/dashboard\/getting-started/);
});
