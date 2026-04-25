# Onboarding Modal Design

**Date:** 2026-04-25
**Status:** Approved for implementation
**Approval basis:** Direct user instruction with supplied modal and journey reference images
**Source of truth:** `.context/attachments/ChatGPT Image Apr 25, 2026, 02_03_15 PM.png`

## Goal

Show a first-run onboarding modal when an authenticated user has no skills, matching the supplied monochrome dashboard reference. The modal helps the user choose between importing an existing skill and creating a first skill, but GitHub integration is intentionally out of scope for this change.

## Scope

- Show the modal over the empty dashboard after sign-up/authentication when the user has zero skills.
- Preserve the existing dashboard, sidebar, skill creation, feedback, and sign-out behavior.
- Add local interactions:
  - close the modal
  - click `Create skill` to dismiss the modal and open the existing skill creation form
  - click `Connect GitHub` to show a short non-integrated connecting state, then an explanatory unavailable message
  - click `Read the guide` to navigate to `/guide`
- Do not add OAuth, GitHub API calls, repository selection, import configuration, or schema changes.

## Visual Direction

- Keep the current Skillfully brutalist/editorial system: black borders, off-white/white surfaces, mono labels, uppercase headings, and grid-backed dashboard.
- Modal structure follows the reference:
  - top step label `01. GET STARTED`
  - large headline `How do you want to start?`
  - two-column choices for import and create on desktop
  - GitHub mark on the import side and document-plus mark on the create side
  - bottom guide rail with `New to agent skills?` and `Read the guide ->`
- The underlying dashboard should look intentionally present and subdued while the modal is open.

## Components And State

- Add a small pure view-state helper for whether the onboarding modal should appear by default.
- Add an `OnboardingModal` component beside the dashboard page because the modal is dashboard-specific but needs isolated render coverage.
- Add a minimal `/guide` guide page so the modal's `Read the guide` action does not navigate to a 404.
- Track three local modal states:
  - `choice`: normal decision state
  - `connecting`: temporary pressed state for the GitHub button
  - `unavailable`: clear message that GitHub import is coming later

## Testing

- Unit-test the default modal visibility helper with the existing Node test runner.
- Add static render coverage for the onboarding modal and `/guide` guide page.
- Keep existing dashboard view-state tests passing.
- Run the dashboard tests and production build.
- Browser-check the new `/guide` page on desktop and mobile. The authenticated dashboard modal requires a valid local `NEXT_PUBLIC_INSTANT_APP_ID` before it can be reached in-browser.
