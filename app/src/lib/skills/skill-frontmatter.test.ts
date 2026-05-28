import assert from "node:assert/strict";
import test from "node:test";

import {
  AGENT_SKILLS_SPEC_URL,
  assertValidSkillMarkdown,
  buildSkillMarkdown,
  extractSkillMarkdownBody,
  parseSkillMarkdownFrontmatter,
  skillSpecName,
  validateSkillMarkdown,
} from "./skill-frontmatter";

test("buildSkillMarkdown creates required frontmatter and keeps the editable body separate", () => {
  const markdown = buildSkillMarkdown({
    name: "Customer Support Workflow",
    description: "Helps agents answer support questions.",
    body: "## Instructions\n\nAnswer from the docs.",
  });

  assert.equal(
    markdown,
    [
      "---",
      "name: customer-support-workflow",
      'description: "Helps agents answer support questions."',
      "---",
      "",
      "## Instructions",
      "",
      "Answer from the docs.",
    ].join("\n"),
  );
  assert.equal(extractSkillMarkdownBody(markdown), "## Instructions\n\nAnswer from the docs.");
  assert.deepEqual(parseSkillMarkdownFrontmatter(markdown), {
    name: "customer-support-workflow",
    description: "Helps agents answer support questions.",
  });
});

test("extractSkillMarkdownBody hides frontmatter from an empty skill", () => {
  const markdown = buildSkillMarkdown({
    name: "empty-skill",
    description: "",
  });

  assert.equal(
    markdown,
    [
      "---",
      "name: empty-skill",
      'description: "Describe when and how agents should use this skill."',
      "---",
      "",
    ].join("\n"),
  );
  assert.equal(extractSkillMarkdownBody(markdown), "");
});

test("extractSkillMarkdownBody preserves horizontal rules and fenced code blocks", () => {
  const markdown = [
    "---",
    "name: video",
    "description: AI video workflow.",
    "---",
    "",
    "# AI Video Prompting Guide",
    "",
    "---",
    "",
    "A strong video prompt follows this formula:",
    "",
    "```",
    "[Subject] + [Action] + [Camera movement]",
    "```",
    "",
    "## Camera Movement Vocabulary",
  ].join("\n");

  assert.equal(
    extractSkillMarkdownBody(markdown),
    [
      "# AI Video Prompting Guide",
      "",
      "---",
      "",
      "A strong video prompt follows this formula:",
      "",
      "```",
      "[Subject] + [Action] + [Camera movement]",
      "```",
      "",
      "## Camera Movement Vocabulary",
    ].join("\n"),
  );
});

test("skillSpecName enforces the Agent Skills frontmatter name shape", () => {
  assert.equal(skillSpecName("  FAQ: Billing + Refunds!  "), "faq-billing-refunds");
  assert.equal(skillSpecName(""), "skill");
  assert.equal(skillSpecName(`${"a".repeat(63)}-suffix`), "a".repeat(63));
});

test("validateSkillMarkdown enforces required Agent Skills frontmatter", () => {
  assert.deepEqual(
    validateSkillMarkdown({
      markdown: [
        "---",
        "name: pdf-processing",
        "description: Extracts PDF text and tables.",
        "---",
        "",
        "Use when processing PDFs.",
      ].join("\n"),
      expectedName: "pdf-processing",
    }),
    {
      valid: true,
      name: "pdf-processing",
      description: "Extracts PDF text and tables.",
    },
  );

  const missingFrontmatter = validateSkillMarkdown({
    markdown: "# Missing frontmatter",
    expectedName: "missing-frontmatter",
  });
  assert.equal(missingFrontmatter.valid, false);
  assert.match(missingFrontmatter.reason, /YAML frontmatter/);

  const missingName = validateSkillMarkdown({
    markdown: ["---", "description: Missing name.", "---"].join("\n"),
    expectedName: "missing-name",
  });
  assert.equal(missingName.valid, false);
  assert.match(missingName.reason, /name is required/);

  const mismatchedName = validateSkillMarkdown({
    markdown: ["---", "name: other-skill", "description: Wrong directory.", "---"].join("\n"),
    expectedName: "expected-skill",
  });
  assert.equal(mismatchedName.valid, false);
  assert.match(mismatchedName.reason, /expected-skill/);

  const missingDescription = validateSkillMarkdown({
    markdown: ["---", "name: pdf-processing", "description: ", "---"].join("\n"),
    expectedName: "pdf-processing",
  });
  assert.equal(missingDescription.valid, false);
  assert.match(missingDescription.reason, /description is required/);
});

test("assertValidSkillMarkdown returns a descriptive spec-linked error", () => {
  assert.throws(
    () =>
      assertValidSkillMarkdown({
        markdown: "# Missing frontmatter",
        expectedName: "missing-frontmatter",
      }),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.equal((error as Error).name, "SkillFrontmatterValidationError");
      assert.match((error as Error).message, /Invalid SKILL\.md/);
      assert.match((error as Error).message, new RegExp(AGENT_SKILLS_SPEC_URL.replaceAll(".", "\\.")));
      return true;
    },
  );
});
