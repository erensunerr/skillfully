# GitHub Import Review Corrections

**Date:** 2026-05-29
**Status:** Implemented

## Requirement

Address the PR review findings without widening the GitHub import behavior beyond the intended per-skill failure UI.

## Behavior

- Import-time failures are matched to candidates by `candidate_id` only.
- Discovery-time validation failures are attached to a candidate only when the warning scope names that candidate's repository or the skill name is unique among discovered candidates.
- Ambiguous validation failures, such as an unscoped `steps` failure when multiple repositories contain `steps`, remain global warnings.
- If existing GitHub imports cannot be checked, otherwise-valid candidates are shown as invalid so the user cannot accidentally create duplicate GitHub imports.
- After a submit, `discoveredCount` is the count of remaining valid/importable candidates.

## Verification

```bash
cd app && node --import tsx --test src/lib/github-import.test.ts src/app/api/dashboard/github/import/route.test.ts src/app/dashboard/page.test.tsx
cd app && npm run lint
cd app && npm test
cd app && npm run build
```
