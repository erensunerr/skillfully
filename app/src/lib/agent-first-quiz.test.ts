import assert from "node:assert/strict";
import test from "node:test";

import { getAgentFirstQuizState, shouldAskAgentAccess } from "./agent-first-quiz";

test("agent-first quiz starts before the agent access step is shown", () => {
  assert.equal(getAgentFirstQuizState(null, null), "start");
  assert.equal(shouldAskAgentAccess(null), false);
});

test("answering yes to agent skills unlocks the second step", () => {
  assert.equal(getAgentFirstQuizState("yes", null), "halfway");
  assert.equal(shouldAskAgentAccess("yes"), true);
});

test("learning path wins over stale agent access answers", () => {
  assert.equal(getAgentFirstQuizState("no", "yes"), "needs_learning");
  assert.equal(getAgentFirstQuizState("no", "no"), "needs_learning");
});

test("ready-now path only happens after both yes answers", () => {
  assert.equal(getAgentFirstQuizState("yes", "yes"), "ready_now");
  assert.equal(getAgentFirstQuizState("yes", "no"), "needs_learning");
});
