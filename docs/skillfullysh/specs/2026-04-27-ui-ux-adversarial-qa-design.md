# UI/UX Adversarial QA Pass

**Date:** 2026-04-27
**Status:** Implemented
**Approval basis:** User request to spot visual and interaction issues across all pages and finish the UI/UX pass

## Goal

Audit the current Skillfully public and dashboard UI like a hostile user would: resize it, route through the main pages, watch console output, check for native controls, and look for layout overflow, clipped controls, and visual collisions. Fix issues that are clearly UI polish or local-preview robustness without changing database schema, persistence, auth, or publishing flows.

## Coverage

- Public pages: `/`, `/guide`, `/guide/start-with-agent-skills`, `/blog`, and `/blog/how-to-write-better-agent-skills`.
- Dashboard pages: overview, editor, analytics, skill settings, and account settings.
- Viewports: desktop `1440x900` and mobile `390x844`.
- Checks: document-level horizontal overflow, clipped controls, offscreen fixed elements, native `<select>` usage, browser console errors, and screenshot review.

## Findings And Fixes

- Local preview initialized PostHog without a token and produced console noise. PostHog now initializes only when `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is present.
- The landing dashboard preview still used a decorative native `<select>`. It now uses the same styled button language as the rest of the UI preview.
- Mobile dashboard sidebar could exceed viewport width with long skill names and could consume too much first-screen space. Sidebar, skill selector, nav, and account controls now use constrained widths, truncation, and compact mobile layout.
- The editor's side-panel content could visually collide with the sticky publish footer. Editor grid and side panels now clip internal overflow so the publish action remains visually stable.
- MDXEditor could trigger a Next development overlay during lazy mount. The dashboard now loads the editor with a guarded client-side import that avoids setting state after unmount.

## Non-Goals

- No database, Instant schema, or route-handler changes.
- No GitHub integration or publishing behavior changes.
- No content rewrite for guide or blog articles.
- No broad visual redesign beyond issues found during the QA pass.
