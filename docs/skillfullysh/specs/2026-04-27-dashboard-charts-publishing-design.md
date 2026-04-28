# Dashboard Charts And Publishing Flow

**Date:** 2026-04-27
**Status:** Implemented
**Approval basis:** User request to use Recharts, improve editor panel behavior, and replace the publish/install flow

## Goal

Make the dashboard feel less static and closer to an operational product surface without changing data persistence. The overview and analytics charts should use a real charting library, the editor should prioritize authoring space, and publishing should be an explicit public-release confirmation flow.

## Scope

- Add `recharts` through `npm` and use it for the overview metric sparklines, overview usage chart, and analytics charts.
- Remove the editor/analytics workspace top bar that showed `Files`, `Frontmatter` or `Analytics`, and `Validate skill`.
- Make the editor files and frontmatter panels collapsible.
- Make files and frontmatter panel contents scroll independently.
- Remove the bottom install prompt from the editor footer.
- Keep only `Change publishing options` and `Publish version` in the editor footer.
- Add a local three-step publish modal:
  1. Confirm that publishing makes the skill publicly accessible.
  2. Show the published state and copyable install prompt for Codex or Claude Code.
  3. Wait for installation confirmation, then show `It works now!` with a finish action.
- Remove `agentskills.io` from publishing destinations.
- Add LobeHub Skills, ClawHub, and Hermes Skills Hub to publishing surfaces.

## Non-Goals

- No database or route-handler changes.
- No actual public publishing mutation.
- No real marketplace submission integration.
- No guide or blog content changes.
