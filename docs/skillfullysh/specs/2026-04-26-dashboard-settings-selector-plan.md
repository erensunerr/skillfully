# Dashboard Settings And Selector UI Plan

**Date:** 2026-04-26
**Status:** Implemented

## Task List

- [x] Review the supplied settings, account settings, skill selector, and create-skill modal reference images.
- [x] Read the current dashboard implementation, dashboard render tests, project memory, and related specs.
- [x] Add failing render tests for the skill settings tab, account settings surface, selector dropdown, and create-skill modal.
- [x] Extend dashboard tab state with `settings` and `account`.
- [x] Replace the sidebar native select with a custom skill selector dropdown.
- [x] Add a modal create-skill interaction that reuses the existing create-skill handler.
- [x] Implement the skill settings UI sections:
  - general metadata
  - source mode
  - publishing destinations
  - tracking endpoints
  - danger zone
- [x] Implement the account settings UI sections:
  - profile
  - preferences
  - security
  - data and privacy
  - account menu
- [x] Keep DB, route, schema, auth, onboarding, GitHub, and feedback-template behavior unchanged.
- [x] Run focused dashboard render tests.
- [x] Run the full app test suite.
- [x] Run the production build.
- [x] Validate the settings, account, selector, and modal interactions in-browser at desktop and mobile sizes.
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
