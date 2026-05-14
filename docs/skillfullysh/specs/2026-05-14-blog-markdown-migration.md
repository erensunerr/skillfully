# Blog Markdown Migration

**Date:** 2026-05-14
**Status:** Drafted for implementation

## Summary

This change migrates the public Skillfully blog from the typed `blogArticles` array in `app/src/content/blog.ts` to filesystem-backed Markdown files in `app/content/blog/`.

## Why

The old approach was acceptable for short hand-curated posts, but it was weak for long-form SEO work because:
- article editing inside TypeScript objects was awkward
- citations and links were harder to maintain cleanly
- large posts were noisy in code review
- adding future posts made the single content module harder to manage

## New source of truth

Blog content now lives in:
- `app/content/blog/*.md`

The file name is the slug.

Each post includes frontmatter for:
- title
- subtitle
- category
- publishedAt
- readTime
- author
- nextSlug

## Rendering model

The blog route still lives at:
- `/blog`
- `/blog/[slug]`

The loader in `app/src/content/blog.ts` now:
- reads markdown files from disk
- parses frontmatter
- resolves author keys from `authors.ts`
- derives sections from `##` headings for the article layout and table of contents

## Out of scope

- guide content migration
- CMS integration
- dashboard authoring integration for public blog posts

## Validation expectations

- focused blog tests pass
- full app tests pass
- lint/typecheck passes
- production build passes
- `/blog` and existing post routes continue to render
