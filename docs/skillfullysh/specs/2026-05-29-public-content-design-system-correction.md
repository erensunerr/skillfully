# Public Content Design System Correction

**Date:** 2026-05-29
**Status:** Implemented
**Approval basis:** Direct request to correct the guide/blog blue visual system and undersized public links while keeping the landing page visual design.

## Goal

Make public guide and blog surfaces feel like the same product as the landing page.

## Scope

- Reuse the landing page header on the blog index, blog article, and guide article routes.
- Keep the shared header visually identical across landing, guide, and blog.
- Strengthen header hierarchy through consistent brand, centered primary navigation, right-side auth/onboarding actions, uppercase mono nav labels, and 44px minimum hit areas.
- Remove the bright blue guide/blog visual system.
- Replace blue and pale-blue article treatments with Skillfully ink, paper, white, borders, and mono labels.
- Raise public nav, footer, read, guide-step, and table-of-contents links to at least 44px where they are primary interactive targets.

## Non-Goals

- No dashboard behavior changes.
- No booking modal behavior changes.
- No content rewrite.
- No dependency updates.

## Verification

```bash
cd app && node --import tsx --test src/app/public-content-design.test.tsx
cd app && node --import tsx src/app/blog/\[slug\]/page.test.tsx
cd app && node --import tsx src/app/guide/\[slug\]/page.test.tsx
cd app && npm test
cd app && npm run lint
```
