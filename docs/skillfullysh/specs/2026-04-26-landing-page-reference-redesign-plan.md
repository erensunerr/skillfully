# Landing Page Reference Redesign Plan

**Date:** 2026-04-26
**Status:** Implemented

## Task List

- [x] Read the existing landing page, landing render test, project memories, and prior landing-page spec.
- [x] Treat the supplied image as the accepted visual concept and skip additional concept generation.
- [x] Update `app/src/app/page.test.tsx` first to assert the new hero, guide/blog routes, feature sections, FAQ, CTA, and absence of the legacy guide route.
- [x] Run the landing render test and confirm it fails against the prior page.
- [x] Replace `app/src/app/page.tsx` with the reference-inspired landing page:
  - header with guide/blog nav and auth actions
  - split hero with schematic visual
  - onboarding marquee band
  - dashboard preview
  - four-feature grid
  - developer/domain-expert persona cards
  - three-step feedback loop
  - interactive FAQ disclosures
  - dark CTA and footer
- [x] Re-run the render test and confirm it passes.
- [x] Run the full app test suite.
- [x] Run the production build.
- [x] Verify the landing page in a browser-sized render at desktop and mobile widths.
- [x] Commit and push the atomic change set.

## Verification Commands

```bash
cd app && npm test
cd app && npm run build
cd app && npm run start -- --hostname 127.0.0.1 --port 3001
```

Browser verification targets:

```text
http://127.0.0.1:3001/
http://127.0.0.1:3001/guide
http://127.0.0.1:3001/blog
http://127.0.0.1:3001/dashboard
```
