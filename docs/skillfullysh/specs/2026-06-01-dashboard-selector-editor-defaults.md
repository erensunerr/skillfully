# Dashboard Selector And Editor Defaults

**Date:** 2026-06-01
**Status:** Implemented
**Approval basis:** Direct user request with dashboard screenshot

## Goal

Keep the dashboard usable when an account has many skills and make the Editor tab less visually busy on first open.

## Decisions

- Constrain the open skill selector menu so the skill rows scroll inside the menu instead of extending past the viewport.
- Keep the create-skill action visible outside the scrollable skill-row list.
- Start the Editor tab with the Files and Frontmatter rails collapsed.
- Preserve the existing controls and data model; users can expand either rail with the existing rail toggles.

## Verification

```bash
cd app && node --import tsx --test src/app/dashboard/page.test.tsx
cd app && npm run lint
cd app && npm test
```
