# Guide Articles Implementation Plan

**Goal:** Replace the single guide page with a five-article guide under `/guide`.

## Task 1: Pin behavior with failing tests

**Files:**
- Delete: old single-page guide render test
- Create: `app/src/app/guide/page.test.tsx`
- Create: `app/src/app/guide/[slug]/page.test.tsx`
- Create: `app/src/app/no-legacy-guide-route-references.test.ts`
- Modify: `app/src/app/blog/page.test.tsx`
- Modify: `app/src/app/blog/[slug]/page.test.tsx`
- Modify: `app/src/app/dashboard/onboarding-modal.test.tsx`

- [x] Require `/guide` links from blog and onboarding.
- [x] Require five guide articles with five sections each.
- [x] Require guide article navigation to the next guide article.
- [x] Guard product source against the removed public route.
- [x] Run `npm test` and observe the expected red state.

## Task 2: Implement the guide article model and routes

**Files:**
- Create: `app/src/content/guide.ts`
- Create: `app/src/app/guide/page.tsx`
- Create: `app/src/app/guide/[slug]/page.tsx`
- Delete: old single-page guide route
- Modify: `app/src/app/blog/page.tsx`
- Modify: `app/src/app/blog/[slug]/page.tsx`
- Modify: `app/src/app/dashboard/onboarding-modal.tsx`

- [x] Add typed guide content for five articles with five sections each.
- [x] Add the guide library route.
- [x] Add the guide article route with static params.
- [x] Update product links to `/guide`.
- [x] Run `npm test`.

## Task 3: Verify and land

**Files:**
- Modify: `docs/skillfullysh/memories/2026-04-25-memory.md`
- Modify: `docs/skillfullysh/memories/TOC.md`

- [x] Run `npm run build`.
- [x] Browser-check desktop and mobile surfaces.
- [x] Commit and push the atomic change.
