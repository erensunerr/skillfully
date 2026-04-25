# Guide And Blog Implementation Plan

**Goal:** Redesign `/docs` into a multi-step Skillfully guide and add a publishable blog.

## Task 1: Pin route behavior with tests

**Files:**
- Modify: `app/src/app/docs/page.test.tsx`
- Create: `app/src/app/blog/page.test.tsx`
- Create: `app/src/app/blog/[slug]/page.test.tsx`

- [x] Update the guide test to require the Demand Curve-style step nav, table of contents, and next-up blog handoff.
- [x] Add a blog index render test.
- [x] Add a blog article render test.
- [x] Run `npm test` and confirm the new expectations fail before implementation.

## Task 2: Implement content and routes

**Files:**
- Create: `app/src/content/blog.ts`
- Modify: `app/src/app/docs/page.tsx`
- Create: `app/src/app/blog/page.tsx`
- Create: `app/src/app/blog/[slug]/page.tsx`

- [x] Add typed article data for published blog posts.
- [x] Redesign `/docs` around the six-step guide.
- [x] Add `/blog` article index.
- [x] Add `/blog/[slug]` article renderer with static params and not-found behavior.
- [x] Run `npm test`.

## Task 3: Verify and document

**Files:**
- Modify: `docs/skillfullysh/memories/2026-04-25-memory.md`
- Keep: `docs/skillfullysh/memories/TOC.md`

- [x] Run `npm run build`.
- [x] Browser-check the updated routes on desktop and mobile.
- [x] Update memory docs.
- [x] Commit and push the atomic change.
