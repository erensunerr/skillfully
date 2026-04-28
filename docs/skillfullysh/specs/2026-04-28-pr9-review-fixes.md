# PR #9 Review Fixes

**Date:** 2026-04-28
**Status:** Implemented

## Goal

Resolve the security, data integrity, and editor usability issues found in the PR #9 code and visual review before merge.

## GitHub App Installation

- Added `/api/github/install` as the only dashboard entrypoint for starting a GitHub App installation.
- The install route requires a signed-in dashboard user, creates an HMAC-signed state token containing `ownerId`, expiry, and nonce, then redirects to GitHub.
- `/api/github/callback` now requires dashboard auth, verifies the signed state, fetches the installation from GitHub with the App JWT, and only then creates or updates `githubInstallations`.
- The callback refuses to take over an installation already owned by a different owner.
- Webhooks now fail closed when `GITHUB_APP_WEBHOOK_SECRET` is missing and preserve `ownerId` on installation metadata updates.

## Publishing Semantics

- Dashboard and author-agent publish routes only mark a skill published when at least one adapter reports `published` or `submitted`.
- Directory-only `manual_ready` packets no longer roll the draft forward or make public manifests imply that GitHub publishing happened.
- Publish failures are tracked with `skill_publish_failed` for funnel diagnosis.
- GitHub publish branch names now include a short random suffix after the timestamp to reduce same-version collision risk.

## Files And Storage

- Text file updates query by `{ ownerId, id }` instead of scanning every file for an owner.
- File creation and path updates reject duplicate paths inside the same skill version.
- Dashboard file item routes support `DELETE`; primary `SKILL.md` is protected, while assets and non-primary files can be removed.
- Public manifest, file redirect, and public skill page reads refresh Instant Storage URLs from `$files` by `storageFileId` before falling back to the cached URL.

## Editor UX

- Removed the manual `Save changes` button and added debounced autosave for markdown edits.
- Removed the visible autosave status text and file-list dirty/active dot so autosave is quiet.
- Publish flushes pending dirty files before opening the publish confirmation.
- Status is now derived from draft/published state and is not editable from the editor panel.
- Asset rows no longer show lock icons and include a delete action.
- Removed the visible Skillfully-owned SKILL.md pill from the editor.
- The markdown editor content area scrolls inside the editor panel.
- The markdown editor now exposes toolbar controls for block type, bold/italic/underline, inline code, lists, and links.
- The skill selector dropdown has a higher stacking context so it opens above the sidebar content.

## Public Install Prompt

The install prompt now tells agents to install the skill from GitHub, using either the imported repository or `erensunerr/skillfully-skills`, then call:

```text
POST https://www.skillfully.sh/api/public/skills/<skillId>/install
```

The new public install endpoint records a `skill_installed` usage event for analytics.

## Verification

- `cd app && npm run lint` passed with the replacement TypeScript check.
- `cd app && npm test` passed with 48 tests.
- `cd app && npm run build` passed on Next.js 16.2.4.
