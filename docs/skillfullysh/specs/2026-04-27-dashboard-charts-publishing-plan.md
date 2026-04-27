# Dashboard Charts And Publishing Flow Plan

**Date:** 2026-04-27
**Status:** Implemented

## Task List

- [x] Review the dashboard authoring, analytics, settings, and related tests.
- [x] Install `recharts` through `npm`.
- [x] Replace hand-authored dashboard SVG charts with Recharts components.
- [x] Remove the editor/analytics top workspace bar.
- [x] Add collapsible files and frontmatter editor panels.
- [x] Make editor side-panel content independently scrollable.
- [x] Replace the editor install-prompt footer with publishing actions only.
- [x] Add the three-step local publish modal with copyable install prompt.
- [x] Replace `agentskills.io` with LobeHub Skills, ClawHub, and Hermes Skills Hub.
- [x] Update focused dashboard tests.
- [x] Run focused tests, full tests, production build, and browser UI verification.

## Verification Commands

```bash
cd app && node --import tsx --test src/app/dashboard/page.test.tsx
cd app && npm test
cd app && npm run build
```

Browser verification target:

```text
http://127.0.0.1:3004/dashboard
```
