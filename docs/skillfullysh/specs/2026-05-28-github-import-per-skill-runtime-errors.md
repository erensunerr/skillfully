# GitHub Import Per-Skill Runtime Errors

**Date:** 2026-05-28
**Status:** Implemented

## Requirement

GitHub import must not show a selected skill import failure as one repository-wide or account-wide modal error.

If importing a candidate fails with an error such as `Validation failed for steps: Attributes are missing in your schema`, the failed candidate should remain in the import list as an invalid, disabled row. Other valid candidates should remain selectable.

## Behavior

- Candidate rows display as `<repo>/<skill name>`.
- Valid rows stay selectable and deselectable until imported.
- Invalid rows are red and non-selectable.
- Import-time failures are attached to the matching candidate id and shown in that row.
- Discovery-time validation failures that identify a skill name, such as `Validation failed for steps: ...`, are attached to the matching candidate row before the modal renders.
- Discovery warnings that are already attached to an invalid candidate row are filtered out so the same validation message is not shown twice as a global warning.
- Repository metadata and import-session cache write failures during discovery are warnings, not a full discovery abort.
- Failed selected candidates are deselected so the user can retry the remaining valid candidates.
- Pure session, GitHub credential, and malformed request failures can still be modal-level errors because they are not attributable to one skill.
- Selectable import rows and their checkboxes use a pointer cursor; disabled rows and checkboxes use a not-allowed cursor.

## Plan

1. Add a modal rendering test for `owner/repo/skill` labels and disabled invalid rows.
2. Add a pure dashboard helper test for applying import failures to candidate rows.
3. Update the import POST response type and client handling to preserve failure bodies even on `400`.
4. Update the server to persist failed candidate statuses in the cached session candidates.
5. Verify focused tests, then full lint/test/build if the environment allows it.

## Verification

```bash
cd app && node --import tsx --test src/lib/github-import.test.ts src/app/dashboard/github-import-modal.test.tsx src/app/dashboard/page.test.tsx
cd app && npm run lint
cd app && npm test
cd app && npm run build
```
