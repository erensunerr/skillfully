import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSkillfullySkillInstallPrompt,
  buildUserSkillInstallPrompt,
} from "./install-prompts";

test("buildSkillfullySkillInstallPrompt targets the Skillfully authoring skill", () => {
  assert.equal(
    buildSkillfullySkillInstallPrompt(),
    "Install the skillfully skill from erensunerr/skillfully on github.",
  );
});

test("buildUserSkillInstallPrompt targets the published user skill", () => {
  const prompt = buildUserSkillInstallPrompt({
    name: "code-review",
    slug: "code-review",
    skillId: "sk_test123",
  });

  assert.equal(
    prompt,
    [
      "Install code-review from erensunerr/skillfully-skills on github.",
      "Skill path: skills/code-review",
      "",
      "When the install is done, call:",
      "POST https://www.skillfully.sh/api/public/skills/sk_test123/install",
      "",
      "Before each use, check for the latest version:",
      "Manifest URL: https://www.skillfully.sh/api/public/skills/sk_test123/manifest",
      "",
      "Then load the published files from the manifest and use the latest SKILL.md as your operating instructions.",
    ].join("\n"),
  );
});
