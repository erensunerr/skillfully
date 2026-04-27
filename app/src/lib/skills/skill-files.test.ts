import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSkillManifest,
  createDefaultSkillFile,
  insertSkillfullyExcerpt,
  normalizeSkillFilePath,
  skillSlug,
} from "./skill-files";

test("skillSlug creates stable filesystem-safe slugs", () => {
  assert.equal(skillSlug("Customer Support Workflow"), "customer-support-workflow");
  assert.equal(skillSlug("  FAQ: Billing + Refunds!  "), "faq-billing-refunds");
  assert.equal(skillSlug(""), "skill");
});

test("normalizeSkillFilePath keeps skill files inside the skill folder", () => {
  assert.equal(normalizeSkillFilePath("SKILL.md"), "SKILL.md");
  assert.equal(normalizeSkillFilePath("/examples/basic.md"), "examples/basic.md");
  assert.equal(normalizeSkillFilePath("docs//faq.md"), "docs/faq.md");
  assert.throws(() => normalizeSkillFilePath("../secret.md"), /invalid skill file path/);
  assert.throws(() => normalizeSkillFilePath(".env"), /invalid skill file path/);
});

test("createDefaultSkillFile preserves the skill name and feedback endpoint", () => {
  const file = createDefaultSkillFile({
    name: "billing-support",
    description: "Helps agents answer billing questions.",
    feedbackUrl: "https://www.skillfully.sh/feedback/sk_demo",
  });

  assert.equal(file.path, "SKILL.md");
  assert.match(file.contentText, /^# billing-support/m);
  assert.match(file.contentText, /Helps agents answer billing questions\./);
  assert.match(file.contentText, /https:\/\/www\.skillfully\.sh\/feedback\/sk_demo/);
});

test("buildSkillManifest includes text files, assets, version metadata, and hashes", () => {
  const manifest = buildSkillManifest({
    skill: {
      skillId: "sk_demo",
      name: "demo-skill",
      slug: "demo-skill",
      description: "Demo",
    },
    version: {
      id: "version-1",
      version: "1.0.0",
      status: "published",
    },
    files: [
      {
        id: "file-1",
        path: "SKILL.md",
        kind: "markdown",
        contentText: "# demo-skill",
        storageUrl: null,
      },
      {
        id: "file-2",
        path: "assets/logo.png",
        kind: "asset",
        contentText: null,
        storageUrl: "https://storage.example/logo.png",
      },
    ],
  });

  assert.equal(manifest.skill_id, "sk_demo");
  assert.equal(manifest.slug, "demo-skill");
  assert.equal(manifest.version, "1.0.0");
  assert.equal(manifest.files.length, 2);
  assert.equal(manifest.files[0].path, "SKILL.md");
  assert.equal(manifest.files[0].sha256.length, 64);
  assert.equal(manifest.files[1].url, "https://storage.example/logo.png");
});

test("insertSkillfullyExcerpt requires consent for imported skills", () => {
  const original = "# Existing Skill\n\n## Workflow\n\nDo the work.";

  assert.throws(
    () =>
      insertSkillfullyExcerpt(original, {
        feedbackUrl: "https://www.skillfully.sh/feedback/sk_demo",
        allowAnalyticsExcerpt: false,
      }),
    /author consent is required/,
  );

  const updated = insertSkillfullyExcerpt(original, {
    feedbackUrl: "https://www.skillfully.sh/feedback/sk_demo",
    allowAnalyticsExcerpt: true,
  });

  assert.match(updated, /## Skillfully feedback/);
  assert.match(updated, /https:\/\/www\.skillfully\.sh\/feedback\/sk_demo/);
});
