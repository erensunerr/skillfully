import assert from "node:assert/strict";
import test from "node:test";

import {
  canOpenSkillTab,
  githubConnectionStatusMessage,
  isAnalyticsLocked,
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

test("shows a dashboard message when GitHub redirects without an import session", () => {
  assert.equal(
    githubConnectionStatusMessage({ status: "unauthorized", hasImportSession: false }),
    "GitHub connected, but Skillfully could not match it to your signed-in session. Sign in and connect GitHub again.",
  );
  assert.equal(
    githubConnectionStatusMessage({ status: "installed", hasImportSession: false }),
    "GitHub connected, but Skillfully could not start an import session. Connect GitHub again.",
  );
  assert.equal(
    githubConnectionStatusMessage({ status: "installed", hasImportSession: true }),
    "",
  );
});

test("use-only shared skills are limited to the overview tab", () => {
  const useOnlySkill = { id: "skill-1", accessLevel: "use" as const };
  const editSkill = { id: "skill-2", accessLevel: "edit" as const, publishedVersionId: "version-1" };
  const draftOwnerSkill = { id: "skill-3", accessLevel: "owner" as const, status: "draft" };

  assert.equal(canOpenSkillTab(useOnlySkill, "overview"), true);
  assert.equal(canOpenSkillTab(useOnlySkill, "editor"), false);
  assert.equal(canOpenSkillTab(useOnlySkill, "analytics"), false);
  assert.equal(canOpenSkillTab(useOnlySkill, "settings"), false);
  assert.equal(canOpenSkillTab(editSkill, "editor"), true);
  assert.equal(canOpenSkillTab(editSkill, "analytics"), true);
  assert.equal(canOpenSkillTab(draftOwnerSkill, "analytics"), false);
  assert.equal(isAnalyticsLocked(draftOwnerSkill), true);
  assert.equal(resolveDashboardTabForSkill(useOnlySkill, "settings"), "overview");
  assert.equal(resolveDashboardTabForSkill(draftOwnerSkill, "analytics"), "overview");
});
