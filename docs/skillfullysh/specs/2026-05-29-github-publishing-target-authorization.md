# GitHub Publishing Target Authorization

**Date:** 2026-05-29
**Status:** Implemented

## Requirement

Prevent dashboard or agent publish flows from using a GitHub App installation or repository that is not connected to the authenticated skill owner's account.

## Behavior

- Dashboard PATCH updates for `github` publishing targets validate the final `installation_id` and `repo_full_name` together before persisting them.
- The installation must exist in `githubInstallations` with `ownerId` matching the skill owner.
- The repository must exist in `githubRepositories` for the same owner and installation, and must not be explicitly deselected.
- The server stores normalized repository and installation values after authorization succeeds.
- Publish context construction re-validates any stored GitHub target with both repository and installation values before returning it to publish adapters.
- GitHub publish adapters require `consentStatus === "granted"` before resolving a GitHub publish target or creating an installation token.

## Verification

```bash
cd app && node --import tsx --test src/lib/skills/repository.test.ts src/lib/publishing/publish.test.ts
cd app && npm run lint
cd app && npm test
cd app && npm run build
```
