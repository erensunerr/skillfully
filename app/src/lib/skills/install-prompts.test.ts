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

test("buildUserSkillInstallPrompt targets Skillfully-managed published skills by default", () => {
  const prompt = buildUserSkillInstallPrompt({
    name: "code-review",
    slug: "code-review",
    skillId: "sk_test123",
  });

  assert.equal(
    prompt,
    [
      "Install code-review from Skillfully.",
      "",
      "This skill is stored on Skillfully, not GitHub.",
      "Manifest URL: https://www.skillfully.sh/api/skills/sk_test123/manifest",
      "SKILL.md URL: https://www.skillfully.sh/api/skills/sk_test123/files/SKILL.md",
      "",
      "When the install is done, call:",
      "POST https://www.skillfully.sh/api/skills/sk_test123/install",
      "",
      "Before each use, check the manifest for the latest version. Then load the published files from the manifest and use the latest SKILL.md as your operating instructions.",
    ].join("\n"),
  );
});

test("buildUserSkillInstallPrompt preserves GitHub-managed source repo and path", () => {
  const prompt = buildUserSkillInstallPrompt({
    name: "code-review",
    slug: "code-review",
    skillId: "sk_test123",
    repoFullName: "octocat/Hello-World",
    skillRoot: ".agents/skills/code-review",
  });

  assert.equal(
    prompt,
    [
      "Install code-review from octocat/Hello-World on github.",
      "Skill path: .agents/skills/code-review",
      "",
      "When the install is done, call:",
      "POST https://www.skillfully.sh/api/skills/sk_test123/install",
      "",
      "Before each use, check for the latest version:",
      "Manifest URL: https://www.skillfully.sh/api/skills/sk_test123/manifest",
      "",
      "Then load the published files from the manifest and use the latest SKILL.md as your operating instructions.",
    ].join("\n"),
  );
});

test("buildUserSkillInstallPrompt includes private link-use token when provided", () => {
  const prompt = buildUserSkillInstallPrompt({
    name: "code-review",
    slug: "code-review",
    skillId: "sk_test123",
    linkUseToken: "slt_test",
  });

  assert.match(prompt, /Manifest URL: https:\/\/www\.skillfully\.sh\/api\/skills\/sk_test123\/manifest\?share=slt_test/);
  assert.match(prompt, /SKILL\.md URL: https:\/\/www\.skillfully\.sh\/api\/skills\/sk_test123\/files\/SKILL\.md\?share=slt_test/);
  assert.match(prompt, /POST https:\/\/www\.skillfully\.sh\/api\/skills\/sk_test123\/install\?share=slt_test/);
});
