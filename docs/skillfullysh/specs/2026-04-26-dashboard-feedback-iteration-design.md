# Dashboard Feedback Iteration

**Date:** 2026-04-26
**Status:** Implemented
**Approval basis:** Direct user feedback on the dashboard overview, editor, navigation, controls, and theme behavior

## Goal

Refine the dashboard shell after the reference redesign while keeping the change focused on UI and client-side interactions. The pass should make the dashboard feel more like a real app surface: stable left navigation, route-backed views, a working markdown editor, non-native dropdowns, and light/dark/system theme support.

## Scope

- Remove `Skill health` and `Needs attention` from the overview.
- Keep the desktop sidebar fixed and non-scrollable, with settings/account controls visible near the bottom.
- Make the right-hand dashboard surface own scrolling for overview, analytics, and settings.
- Keep the editor surface from page-scrolling on desktop; files, editor canvas, frontmatter, and publish controls should stay visible inside the viewport.
- Replace the static editor article preview with a working MDXEditor-backed markdown editor.
- Remove publishing destinations from the editor surface and link to skill settings for publishing options.
- Replace dashboard native dropdowns with custom `react-select` controls.
- Route dashboard surfaces through `/dashboard/<skill-id>/overview`, `/dashboard/<skill-id>/editor`, `/dashboard/<skill-id>/analytics`, `/dashboard/<skill-id>/settings`, and `/dashboard/settings`.
- Add account theme controls for light, dark, and system, with CSS variable support for dark mode.

## Non-Goals

- No database schema changes.
- No route-handler or persistence changes.
- No GitHub publishing integration.
- No blog or guide edits in this pass.
