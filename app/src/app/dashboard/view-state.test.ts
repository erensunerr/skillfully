import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveDashboardViewState,
  shouldShowOnboardingModalByDefault,
} from "./view-state";

test("shows detail view for list screen when skills exist", () => {
  const result = resolveDashboardViewState({
    screen: "list",
    selectedSkillId: null,
    skills: [{ id: "skill-1" }],
  });

  assert.deepEqual(result, {
    kind: "detail",
    skillId: "skill-1",
  });
});

test("shows empty view when there are no skills", () => {
  const result = resolveDashboardViewState({
    screen: "list",
    selectedSkillId: null,
    skills: [],
  });

  assert.deepEqual(result, {
    kind: "empty",
  });
});

test("shows onboarding modal by default only when no skills exist", () => {
  assert.equal(shouldShowOnboardingModalByDefault({ skills: [] }), true);
  assert.equal(
    shouldShowOnboardingModalByDefault({ skills: [{ id: "skill-1" }] }),
    false,
  );
});
