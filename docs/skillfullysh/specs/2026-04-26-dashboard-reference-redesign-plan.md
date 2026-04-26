# Dashboard Reference Redesign Plan

**Date:** 2026-04-26
**Status:** Implemented

## Task List

- [x] Read the current dashboard implementation, tests, project memories, and current specs.
- [x] Treat the supplied image as the accepted dashboard visual concept.
- [x] Add a dashboard render test first for the new operational overview labels and controls.
- [x] Confirm the new render test fails against the prior dashboard UI.
- [x] Replace `app/src/app/dashboard/page.tsx` UI while preserving the existing InstantDB hooks, create-skill transaction, onboarding modal wiring, feedback-template fetch, and route structure.
- [x] Add the reference dashboard shell:
  - left sidebar with skill selector and navigation
  - skill header with version and status badges
  - editor and installation-prompt actions
  - success and active-user metric cards
  - usage chart
  - skill health table
  - needs-attention and sentiment panels
  - recent feedback table
  - publishing and version panels
- [x] Re-run the focused dashboard render test.
- [x] Run the full app test suite.
- [x] Run the production build.
- [x] Verify the dashboard in-browser at desktop and mobile widths through the local preview flow.
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
