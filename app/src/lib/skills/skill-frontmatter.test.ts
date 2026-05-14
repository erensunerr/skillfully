import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSkillMarkdown,
  extractSkillMarkdownBody,
  parseSkillMarkdownFrontmatter,
  skillSpecName,
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

test("skillSpecName enforces the Agent Skills frontmatter name shape", () => {
  assert.equal(skillSpecName("  FAQ: Billing + Refunds!  "), "faq-billing-refunds");
  assert.equal(skillSpecName(""), "skill");
  assert.equal(skillSpecName(`${"a".repeat(63)}-suffix`), "a".repeat(63));
});
