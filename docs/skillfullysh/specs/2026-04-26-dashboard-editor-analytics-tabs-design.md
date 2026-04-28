# Dashboard Editor And Analytics Tabs

**Date:** 2026-04-26
**Status:** Implemented
**Approval basis:** Direct user instruction to add the supplied editor and analytics tab references
**Reference images:**
- `.context/attachments/Editor.png`
- `.context/attachments/Analytics.png`

## Goal

Extend the dashboard redesign with reference-matched `Editor` and `Analytics` tabs while keeping the change UI-only. The existing InstantDB reads, create-skill transaction, feedback template fetch, auth flow, onboarding modal, and routes remain unchanged.

## Editor Tab

- Keep the existing sidebar and make `Editor` the active sidebar item.
- Add the top workspace bar with `Files`, `Frontmatter`, and `Validate skill`.
- Add a file rail with editable markdown files and read-only assets.
- Add a markdown-style editing canvas with toolbar controls, skill title, summary, blockquote, usage guidance, workflow, response style, and examples.
- Add a frontmatter rail with local-only controls for name, summary, version, and status.
- Show local validation status, version history, publishing destinations, a `Publish version` button, and an install skill prompt.

## Analytics Tab

- Keep the same sidebar and make `Analytics` the active sidebar item.
- Add the top workspace bar with `Files`, `Analytics`, and `Validate skill`.
- Add UI filters for published version, feedback search, date range, and sentiment chips.
- Add active-user and success-rate chart panels.
- Add a feedback table with time, sentiment, agent/source, feedback copy, and pagination.
- Keep search and sentiment filtering local to the UI only.

## Behavior Scope

- Tab changes are local React state, not new routes.
- Editor inputs are local React state, not persisted.
- Analytics filters are local React state, not query parameters or database filters.
- Analytics chart and table values are placeholder operational data until the real analytics model exists.
- Existing overview copy/install behavior remains unchanged.

## Responsiveness

- Desktop mirrors the reference with side rails and wide charts.
- Mobile stacks workspace rails and keeps wide tables/charts horizontally scrollable inside their panels.
- The sidebar remains a stacked header on mobile and a sticky rail on desktop.
