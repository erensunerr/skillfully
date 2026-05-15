# Guide And Blog Editing Guide

**Date:** 2026-05-14
**Status:** Current

## Overview

The public guide and blog now use two different content models:

- Guide articles remain typed TypeScript content in `app/src/content/guide.ts`
- Blog posts are filesystem-backed Markdown content in `app/content/blog/`

The route files render those content sources:

- Guide index: `app/src/app/guide/page.tsx`
- Guide article: `app/src/app/guide/[slug]/page.tsx`
- Blog index: `app/src/app/blog/page.tsx`
- Blog article: `app/src/app/blog/[slug]/page.tsx`

Edit the content files for normal writing changes. Edit the route files only when the layout, styling, navigation, or rendering model needs to change.

## Editing The Guide

Open `app/src/content/guide.ts`. The guide is an array named `guideArticles`.
Each object is one public article under `/guide/[slug]`.

```ts
{
  slug: "start-with-agent-skills",
  number: "01",
  title: "Start with agent skills",
  subtitle: "Define the repeatable job before you worry about snippets.",
  sections: [
    {
      id: "what-a-skill-is-for",
      title: "What a skill is for",
      body: "An agent skill is a reusable operating procedure.",
      bullets: [
        "Treat the skill as procedure, not inspiration.",
        "Name the job, the inputs, and the visible result.",
      ],
    },
  ],
}
```

Guide fields:
- `slug`: URL segment. `start-with-agent-skills` renders at `/guide/start-with-agent-skills`.
- `number`: visible article number in the guide navigation.
- `title`: article headline.
- `subtitle`: short summary shown on the index and article page.
- `sections`: article body sections.
- `section.id`: anchor target used by the table of contents.
- `section.title`: visible section heading.
- `section.body`: main paragraph for the section.
- `section.bullets`: callout bullet list under the section body.

Current constraint: the guide is intentionally five articles with five sections each. Tests enforce that shape. If you want a different count, update the tests and the copy that says `5 articles. 5 sections each.`

To add a guide article:
1. Add a new object to `guideArticles`.
2. Give it a unique `slug`.
3. Give it the next `number`.
4. Add five `sections`.
5. Keep each `section.id` unique within the article.
6. Update guide tests if the article count changes.

To reorder guide articles:
1. Move objects inside `guideArticles`.
2. Update the `number` fields so visible numbering still matches the order.
3. Check `getNextGuideArticle` behavior at the bottom of `guide.ts`; it uses array order.

To rename a guide URL:
1. Change the article `slug`.
2. Search for the old slug across the repo and update links.
3. If external links already exist, consider adding a redirect before shipping.

## Editing Blog Posts

Blog posts now live as Markdown files in:

- `app/content/blog/*.md`

Each file represents one public blog post under `/blog/[slug]`.
The file name becomes the slug.

Example:

```md
---
title: How to write better agent skills
subtitle: A practical system for turning a good prompt into an agent skill.
category: Skill authoring
publishedAt: 2026-04-25
readTime: 7 min read
author: skillfully-editorial
nextSlug: measuring-agent-skill-quality
---

## Instrument the outcome

A useful skill has a clear job.

> **The feedback question**
>
> Ask for the result, the blocker, and the confidence level.
```

Blog frontmatter fields:
- `title`: post headline.
- `subtitle`: summary shown on the index and article page.
- `category`: label shown in article metadata.
- `publishedAt`: ISO-style date in frontmatter. It renders as a human-readable date.
- `readTime`: display read-time string.
- `author`: author key resolved by `app/src/content/authors.ts`.
- `nextSlug`: optional slug for the next-article CTA.

Author keys currently supported:
- `skillfully-editorial`

Markdown rules:
- Use `##` headings for top-level article sections. These become the table of contents.
- Use standard Markdown paragraphs, lists, links, and blockquotes.
- Use blockquotes for callout-style content.
- Use `###` headings inside a section if you need subheadings.

To add a blog post:
1. Create a new file in `app/content/blog/`.
2. Name it with the intended slug, for example `what-is-an-agent-skill.md`.
3. Add frontmatter with all required fields.
4. Use `##` headings to create sections.
5. If the post should link to another post in the next-article CTA, set `nextSlug`.

To reorder blog posts:
1. Change `publishedAt` or the file set as needed.
2. The loader sorts posts by `publishedAt` descending, then slug ascending for ties.
3. Update `nextSlug` values if the next-article loop should change.

To rename a blog URL:
1. Rename the file.
2. Update any `nextSlug` values that point to the old slug.
3. Search for the old slug across the repo and update links.
4. If external links already exist, consider adding a redirect before shipping.

## Validation

Install dependencies if needed:

```bash
cd app && npm install
```

Focused blog tests:

```bash
cd app && node --import tsx --test src/content/blog.test.ts src/app/blog/page.test.tsx src/app/blog/[slug]/page.test.tsx
```

Full test pass:

```bash
cd app && node --import tsx --test $(find src -name '*.test.ts' -o -name '*.test.tsx' | sort)
```

Type check:

```bash
cd app && npm run lint
```

Production build:

```bash
cd app && npm run build
```

Useful route checks:

```text
/blog
/blog/how-to-write-better-agent-skills
/blog/measuring-agent-skill-quality
/guide
/guide/start-with-agent-skills
```

## Common Gotchas

- The guide is still typed TypeScript content. The blog is now Markdown files. Do not assume they share the same editing model.
- The blog loader expects valid frontmatter. Missing `title`, `subtitle`, `category`, `publishedAt`, `readTime`, or `author` will fail the load.
- `author` must match a known author key in `app/src/content/authors.ts`.
- `nextSlug` must match an existing blog slug if you want the next-article CTA to render.
- Blog table-of-contents entries come from `##` headings. If a post has no `##` headings, it will not render like the other posts.
- Keep public links on `/guide` and `/blog`; do not reintroduce the removed legacy public route.
