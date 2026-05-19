import assert from "node:assert/strict";
import test from "node:test";

import {
  canOpenSkillTab,
  resolveDashboardTabForSkill,
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

test("use-only shared skills are limited to the overview tab", () => {
  const useOnlySkill = { id: "skill-1", accessLevel: "use" as const };
  const editSkill = { id: "skill-2", accessLevel: "edit" as const };

  assert.equal(canOpenSkillTab(useOnlySkill, "overview"), true);
  assert.equal(canOpenSkillTab(useOnlySkill, "editor"), false);
  assert.equal(canOpenSkillTab(useOnlySkill, "analytics"), false);
  assert.equal(canOpenSkillTab(useOnlySkill, "settings"), false);
  assert.equal(canOpenSkillTab(editSkill, "editor"), true);
  assert.equal(resolveDashboardTabForSkill(useOnlySkill, "settings"), "overview");
});
