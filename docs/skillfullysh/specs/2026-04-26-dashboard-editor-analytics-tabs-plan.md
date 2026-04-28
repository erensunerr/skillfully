# Dashboard Editor And Analytics Tabs Plan

**Date:** 2026-04-26
**Status:** Implemented

## Task List

- [x] Review the editor and analytics reference images.
- [x] Read the current dashboard implementation, dashboard test, project memory, and current dashboard specs.
- [x] Add failing render tests for the editor and analytics tab states.
- [x] Add local dashboard tab state for `overview`, `editor`, and `analytics`.
- [x] Wire the sidebar and overview `Go to Editor` action to local tab changes.
- [x] Implement the editor tab UI:
  - workspace top bar
  - file rail
  - markdown editing canvas
  - frontmatter rail
  - validation and version history
  - publishing destinations and install prompt
- [x] Implement the analytics tab UI:
  - filter row
  - active-user and success-rate charts
  - searchable/filterable feedback table
  - pagination footer
- [x] Keep DB, route, schema, auth, onboarding, and feedback-template behavior unchanged.
- [x] Run focused dashboard render tests.
- [x] Run the full app test suite.
- [x] Run the production build.
- [x] Validate overview, editor, and analytics tab interactions in-browser at desktop and mobile sizes.
- [x] Commit and push the atomic change set.

## Verification Commands

```bash
cd app && npm test -- src/app/dashboard/page.test.tsx
cd app && npm test
cd app && npm run build
env NEXT_PUBLIC_INSTANT_APP_ID= npm run dev -- --hostname 127.0.0.1 --port 3001
```

Browser verification target:

```text
http://127.0.0.1:3001/dashboard
```
