import * as assert from "node:assert/strict";
import { test } from "node:test";

import { __internal, blogArticles, getBlogArticle, getNextArticle } from "./blog";

test("blog content loads from markdown files", () => {
  assert.ok(blogArticles.length >= 5);
  assert.equal(blogArticles[0]?.slug, "how-to-write-an-agent-skill");
  assert.equal(blogArticles[1]?.slug, "agent-skills-vs-prompts");
  assert.equal(blogArticles[2]?.slug, "what-is-an-agent-skill");
  assert.equal(blogArticles[3]?.slug, "how-to-write-better-agent-skills");
  assert.equal(blogArticles[4]?.slug, "measuring-agent-skill-quality");
});

test("blog article includes rendered sections and markdown body", () => {
  const article = getBlogArticle("what-is-an-agent-skill");
  assert.ok(article);
  assert.equal(article?.author.name, "Tau Valerius");
  assert.equal(article?.sections[0]?.title, "What an agent skill is");
  assert.match(article?.sections[0]?.markdown ?? "", /An agent skill is a reusable package/);

  const newArticle = getBlogArticle("how-to-write-an-agent-skill");
  assert.ok(newArticle);
  assert.equal(newArticle?.author.name, "Tau Valerius");
  assert.equal(newArticle?.title, "How to Write an Agent Skill That Actually Works");
});

test("section ids remain unique even when headings repeat", () => {
  const sections = __internal.parseSections(`## Overview\n\nFirst section.\n\n## Overview\n\nSecond section.`);
  assert.deepEqual(
    sections.map((section) => section.id),
    ["overview", "overview-2"],
  );
});

test("published dates are normalized for display", () => {
  const article = getBlogArticle("how-to-write-better-agent-skills");
  assert.equal(article?.publishedAt, "Apr 25, 2026");
});

test("next article resolution still works", () => {
  const latestArticle = getBlogArticle("how-to-write-an-agent-skill");
  assert.ok(latestArticle);
  const latestNext = getNextArticle(latestArticle!);
  assert.equal(latestNext?.slug, "agent-skills-vs-prompts");

  const comparisonArticle = getBlogArticle("agent-skills-vs-prompts");
  assert.ok(comparisonArticle);
  const comparisonNext = getNextArticle(comparisonArticle!);
  assert.equal(comparisonNext?.slug, "what-is-an-agent-skill");

  const article = getBlogArticle("what-is-an-agent-skill");
  assert.ok(article);
  const next = getNextArticle(article!);
  assert.equal(next?.slug, "how-to-write-better-agent-skills");
});
