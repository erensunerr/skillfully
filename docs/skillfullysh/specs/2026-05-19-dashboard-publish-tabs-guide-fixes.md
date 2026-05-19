# Dashboard Publish Modal, Tabs, And Guide Fixes

**Date:** 2026-05-19
**Status:** Implemented
**Approval basis:** Direct user request to add publishing feedback, remove tab switching flashes, fix the sidebar guide action, require GitHub PR merge acknowledgement, and tie installation confirmation to real public endpoints

## Goal

Make the dashboard feel responsive during common authoring actions without changing persistence or publish semantics.

## Scope

- Show an explicit busy state after the user confirms publishing from the editor modal.
- Prevent duplicate publish confirmation clicks while the publish request is in flight.
- Keep tab changes between overview, editor, analytics, and settings local to the mounted dashboard so route remounts do not flash the wrong surface.
- Keep the browser URL in sync with the selected skill tab for refreshable deep links.
- Cache the MDX editor client component after first load so returning to the editor tab does not flash the loading shell.
- Change the sidebar `Open Guide` action into a real new-tab link to the first skills guide article.
- Add a GitHub-managed publish step that shows the created PR URL and requires the user to merge it before the installation prompt is displayed.
- Add the same merge-first contract to the agent publish API response through `next_action`.
- Keep Skillfully-managed skills stored on Skillfully. Their publish path uses the `skillfully` adapter, marks the public manifest/files as published, and shows a Skillfully public-endpoint install prompt without any GitHub repo/path.
- Keep GitHub-managed imported skills stored in their source GitHub repository/path. Their publish path uses the GitHub adapter and does not show the install prompt until the PR has been merged.
- Replace the timer-based post-install success state with a check for real usage events recorded by `POST /api/public/skills/<skillId>/install` or `POST /feedback/<skillId>`.
- Update the repo-local `skillfully` skill so author agents show the merge-PR prompt and only treat endpoint-recorded installs or feedback as confirmation.

## Non-Goals

- No dependency updates.
- No guide content changes.

## Verification

```bash
cd app && node --import tsx --test src/app/dashboard/page.test.tsx
cd app && node --import tsx --test src/lib/publishing/publish-response.test.ts
cd app && node --import tsx --test src/lib/skills/install-prompts.test.ts src/lib/publishing/publish-response.test.ts src/lib/skills/repository.test.ts src/lib/publishing/publish.test.ts
cd app && npm test
```
