import assert from "node:assert/strict";
import test from "node:test";

import {
  appendSkillfullyManagedBlock,
  buildSkillManifest,
  buildSkillfullyManagedBlock,
  createDefaultSkillFile,
  insertSkillfullyExcerpt,
  normalizeSkillFilePath,
  skillSlug,
  stripSkillfullyManagedBlock,
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

test("createDefaultSkillFile preserves editable author content without the managed block", () => {
  const file = createDefaultSkillFile({
    name: "billing-support",
    description: "Helps agents answer billing questions.",
  });

  assert.equal(file.path, "SKILL.md");
  assert.match(file.contentText, /^# billing-support/m);
  assert.match(file.contentText, /Helps agents answer billing questions\./);
  assert.doesNotMatch(file.contentText, /Skillfully feedback and updates/);
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
  assert.equal(manifest.feedback_url, "https://www.skillfully.sh/feedback/sk_demo");
  assert.equal(manifest.manifest_url, "https://www.skillfully.sh/api/public/skills/sk_demo/manifest");
  assert.equal(manifest.version, "1.0.0");
  assert.equal(manifest.files.length, 2);
  assert.equal(manifest.files[0].path, "SKILL.md");
  assert.equal(manifest.files[0].sha256.length, 64);
  assert.notEqual(
    manifest.files[0].sha256,
    "5716b00ee8cc37b66f180c5e1f6ab22605b483d718c99ce686dc3c20b2261b20",
  );
  assert.equal(manifest.files[1].url, "https://storage.example/logo.png");
});

test("managed block appends feedback and update instructions without changing editable content", () => {
  const original = "# Existing Skill\n\n## Workflow\n\nDo the work.";
  const updated = appendSkillfullyManagedBlock(original, {
    skillId: "sk_demo",
    baseUrl: "https://www.skillfully.sh",
  });

  assert.match(updated, /<!-- skillfully:managed:start -->/);
  assert.match(updated, /Skillfully feedback and updates/);
  assert.match(updated, /https:\/\/www\.skillfully\.sh\/feedback\/sk_demo/);
  assert.match(updated, /https:\/\/www\.skillfully\.sh\/api\/public\/skills\/sk_demo\/manifest/);
  assert.equal(stripSkillfullyManagedBlock(updated), original);
});

test("buildSkillfullyManagedBlock includes update and feedback endpoints", () => {
  const block = buildSkillfullyManagedBlock({
    skillId: "sk_demo",
    baseUrl: "https://www.skillfully.sh",
  });

  assert.match(block, /POST https:\/\/www\.skillfully\.sh\/feedback\/sk_demo/);
  assert.match(block, /version_id/);
  assert.match(block, /sha256/);
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

  assert.match(updated, /## Skillfully feedback and updates/);
  assert.match(updated, /https:\/\/www\.skillfully\.sh\/feedback\/sk_demo/);
});
