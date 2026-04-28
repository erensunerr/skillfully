# Dashboard Feedback Iteration Plan

**Date:** 2026-04-26
**Status:** Implemented

## Task List

- [x] Review the dashboard feedback and existing dashboard implementation.
- [x] Update focused dashboard render coverage for removed overview panels, editor publishing behavior, theme controls, and route wrappers.
- [x] Install dashboard UI dependencies through npm.
- [x] Add an MDXEditor client wrapper for the editor canvas.
- [x] Add a dashboard `react-select` wrapper and replace native dashboard selects.
- [x] Route skill dashboard tabs and account settings through Next pages.
- [x] Adjust desktop layout so the sidebar stays fixed and the active surface owns scroll behavior.
- [x] Add light/dark/system theme state and CSS variables.
- [x] Keep blog and guide files out of the dashboard commit.
- [x] Run focused dashboard tests.
- [x] Run the full app test suite.
- [x] Run the production build.
- [x] Validate dashboard onboarding, routing, editor typing, layout overflow, and theme interactions in a local browser session.

## Verification Commands

```bash
cd app && node --import tsx --test src/app/dashboard/page.test.tsx
cd app && npm test
cd app && npm run build
env NEXT_PUBLIC_INSTANT_APP_ID= ./node_modules/.bin/next dev --webpack --hostname 127.0.0.1 --port 3002
```

Browser verification target:

```text
http://127.0.0.1:3002/dashboard
```
