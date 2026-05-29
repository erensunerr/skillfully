import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const blueSystemPattern = /#0b66ff|#f3f5f9|#f1f4f8|#d8dce4/;

function assertUsesLandingHeader(html: string) {
  assert.match(html, /aria-label="Skillfully home"/);
  assert.match(html, /Skills Guide/);
  assert.match(html, /data-auth-surface="header"/);
  assert.match(html, /data-booking-surface="header"/);
  assert.match(html, /Book onboarding/);
  assert.match(html, /min-h-11/);
}

test("public content pages use the landing header and monochrome design system", async () => {
  Object.assign(globalThis, { React });
  const { default: BlogPage } = await import("./blog/page");
  const { default: BlogArticlePage } = await import("./blog/[slug]/page");
  const { default: GuideArticlePage } = await import("./guide/[slug]/page");

  const blogIndexHtml = renderToStaticMarkup(<BlogPage />);
  const blogArticleHtml = renderToStaticMarkup(
    await BlogArticlePage({
      params: Promise.resolve({ slug: "how-to-write-better-agent-skills" }),
    }),
  );
  const guideArticleHtml = renderToStaticMarkup(
    await GuideArticlePage({
      params: Promise.resolve({ slug: "start-with-agent-skills" }),
    }),
  );

  for (const html of [blogIndexHtml, blogArticleHtml, guideArticleHtml]) {
    assertUsesLandingHeader(html);
    assert.doesNotMatch(html, blueSystemPattern);
  }

  assert.doesNotMatch(blogIndexHtml, />Dashboard</);
  assert.doesNotMatch(blogArticleHtml, />Dashboard</);
  assert.doesNotMatch(guideArticleHtml, />Dashboard</);
});
