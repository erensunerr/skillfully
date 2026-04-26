# Guide And Blog Editing Guide

**Date:** 2026-04-26
**Status:** Current

## Overview

The public guide and blog are not MDX right now. Both are generated from typed
TypeScript content modules:

- Guide articles: `app/src/content/guide.ts`
- Blog articles: `app/src/content/blog.ts`

The route files render those content objects:

- Guide index: `app/src/app/guide/page.tsx`
- Guide article: `app/src/app/guide/[slug]/page.tsx`
- Blog index: `app/src/app/blog/page.tsx`
- Blog article: `app/src/app/blog/[slug]/page.tsx`

Edit the content files for normal writing changes. Edit the route files only
when the layout, styling, navigation, or rendering model needs to change.

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

Current constraint: the guide is intentionally five articles with five sections
each. Tests enforce that shape. If you want a different count, update the tests
and the copy that says `5 articles. 5 sections each.`

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
3. Check `getNextGuideArticle` behavior at the bottom of `guide.ts`; it uses
   array order.

To rename a guide URL:

1. Change the article `slug`.
2. Search for the old slug across the repo and update links.
3. If external links already exist, consider adding a redirect before shipping.

## Editing Blog Posts

Open `app/src/content/blog.ts`. The blog is an array named `blogArticles`.
Each object is one public post under `/blog/[slug]`.

```ts
{
  slug: "how-to-write-better-agent-skills",
  title: "How to write better agent skills",
  subtitle: "A practical system for turning a good prompt into an agent skill.",
  category: "Skill authoring",
  publishedAt: "Apr 25, 2026",
  readTime: "7 min read",
  author: "Skillfully",
  nextSlug: "measuring-agent-skill-quality",
  sections: [
    {
      id: "instrument-the-outcome",
      title: "Instrument the outcome",
      blocks: [
        {
          type: "paragraph",
          text: "A useful skill has a clear job.",
        },
      ],
    },
  ],
}
```

Blog fields:

- `slug`: URL segment. `how-to-write-better-agent-skills` renders at `/blog/how-to-write-better-agent-skills`.
- `title`: post headline.
- `subtitle`: summary shown on the index and article page.
- `category`: label shown in article metadata.
- `publishedAt`: display date string.
- `readTime`: display read-time string.
- `author`: display author.
- `nextSlug`: optional slug for the next article CTA.
- `sections`: post body sections.
- `section.id`: anchor-friendly section identifier.
- `section.title`: visible section heading.
- `section.blocks`: mixed content blocks inside the section.

Blog block types:

```ts
{ type: "paragraph", text: "Paragraph text." }
```

```ts
{
  type: "callout",
  title: "Callout title",
  body: ["First line.", "Second line."],
}
```

```ts
{
  type: "list",
  items: ["First item.", "Second item."],
}
```

To add a blog post:

1. Add a new object to `blogArticles`.
2. Give it a unique `slug`.
3. Fill in title, subtitle, category, date, read time, and author.
4. Add one or more sections.
5. Use `paragraph`, `callout`, and `list` blocks only unless you extend the
   renderer in `app/src/app/blog/[slug]/page.tsx`.
6. Set `nextSlug` if the article should link to another article.

To reorder blog posts:

1. Move objects inside `blogArticles`.
2. Check the blog index ordering after the move.
3. Update `nextSlug` values if the "next article" loop should change.

To rename a blog URL:

1. Change the article `slug`.
2. Update any `nextSlug` values that point to the old slug.
3. Search for the old slug across the repo and update links.
4. If external links already exist, consider adding a redirect before shipping.

## Validation

Run tests after content edits:

```bash
cd app && npm test
```

Run a production build before shipping larger changes:

```bash
cd app && npm run build
```

Useful route checks:

```text
/guide
/guide/start-with-agent-skills
/blog
/blog/how-to-write-better-agent-skills
```

If you changed a slug, open the changed URL and at least one page that links to
it.

## Common Gotchas

- This is typed TypeScript content, not MDX. Unescaped quotes, missing commas,
  and unsupported block types will fail tests or build.
- Guide article counts and section counts are currently tested. Change tests
  deliberately if the content model changes.
- `nextSlug` must match an existing blog `slug`; otherwise the next-article CTA
  will not render.
- In shell commands, quote paths with brackets, such as
  `app/src/app/guide/[slug]/page.tsx`.
- Keep public links on `/guide` and `/blog`; do not reintroduce the removed
  legacy public route.
