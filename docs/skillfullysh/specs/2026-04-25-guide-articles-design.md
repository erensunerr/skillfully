# Guide Articles Design

**Date:** 2026-04-25
**Status:** Approved for implementation
**Approval basis:** Direct user instruction to remove legacy public guide-route references and make the guide five articles with five sections each

## Goal

Move the public guide to `/guide` only and make it a true multi-article guide, not one article split into page sections.

## Scope

- Remove the legacy public guide route.
- Update onboarding and blog links to point at `/guide`.
- Add `/guide` as the guide library page.
- Add `/guide/[slug]` as the guide article template.
- Seed exactly five guide articles.
- Each guide article has exactly five sections.
- Keep `/blog` as a separate publishing surface for standalone articles.

## Guide Articles

1. Start with agent skills
2. Design the skill contract
3. Install feedback collection
4. Read skill feedback
5. Improve and publish skills

## Validation

- Add tests that require five guide articles and five sections per article.
- Add a product-source guard test for the removed public route.
- Run tests and production build.
- Browser-check the guide index, a guide article, and blog links on desktop and mobile.
