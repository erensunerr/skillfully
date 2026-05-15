import * as assert from "node:assert/strict";
import { test } from "node:test";

import { __internal, blogArticles, getBlogArticle, getNextArticle } from "./blog";

test("blog content loads from markdown files", () => {
  assert.ok(blogArticles.length >= 2);
  assert.equal(blogArticles[0]?.slug, "how-to-write-better-agent-skills");
  assert.equal(blogArticles[1]?.slug, "measuring-agent-skill-quality");
});

test("blog article includes rendered sections and markdown body", () => {
  const article = getBlogArticle("how-to-write-better-agent-skills");
  assert.ok(article);
  assert.equal(article?.author.name, "Skillfully Editorial");
  assert.equal(article?.sections[0]?.title, "Instrument the outcome");
  assert.match(article?.sections[0]?.markdown ?? "", /A useful skill has a clear job/);
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
  const article = getBlogArticle("how-to-write-better-agent-skills");
  assert.ok(article);
  const next = getNextArticle(article!);
  assert.equal(next?.slug, "measuring-agent-skill-quality");
});
