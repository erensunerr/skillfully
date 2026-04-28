# Dashboard Settings And Selector UI

**Date:** 2026-04-26
**Status:** Implemented
**Approval basis:** Direct user instruction to add the supplied settings, selector, and create-skill modal references
**Reference images:**
- `.context/attachments/ChatGPT Image Apr 26, 2026, 07_33_03 PM.png`
- `.context/attachments/ChatGPT Image Apr 26, 2026, 07_33_02 PM.png`
- `.context/attachments/ChatGPT Image Apr 26, 2026, 07_32_54 PM.png`

## Goal

Extend the authenticated dashboard redesign with UI-only settings surfaces and skill selection interactions. The existing InstantDB reads, create-skill transaction, feedback template fetch, auth flow, onboarding modal, and app routes remain unchanged.

## Skill Settings

- Add `Settings` as a first-class dashboard tab in the left rail.
- Render a persistent configuration surface for the selected skill.
- Include sections for general metadata, source mode, publishing destinations, tracking endpoints, and destructive actions.
- Keep GitHub source controls presentational until the integration pass.
- Keep endpoint copy buttons and toggles presentational until real tracking settings exist.

## Account Settings

- Add an account settings surface from the left rail.
- Render profile, preferences, security, and data/privacy sections with table-like rows matching the monochrome reference.
- Include a top account bar with guide, theme, avatar, and account menu controls.
- Keep profile edits, password/session actions, export, and delete actions presentational.

## Skill Selector

- Replace the native select with a custom selector matching the reference: selected skill button, dropdown rows with initials, selected state, and a create-skill action.
- Show reference-style placeholder skill rows when the current account has fewer skills, so the selector has the intended visual density in local UI-only preview.
- Selecting real skills continues to use the existing selected-skill state.

## Create Skill Modal

- Add a centered create-skill modal with name and optional description fields.
- Wire `Create skill` to the existing create-skill handler and transaction.
- Keep `Import from GitHub` as an inert local affordance for the later integration pass.

## Non-Goals

- No database schema changes.
- No route changes.
- No GitHub integration.
- No persistence for settings, preferences, or source/tracking controls.
- No changes to onboarding, auth, or feedback-template behavior.
