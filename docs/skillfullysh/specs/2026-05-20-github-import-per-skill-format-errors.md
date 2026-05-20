# GitHub Import Per-Skill Format Errors

**Date:** 2026-05-20
**Status:** Implemented

## Requirement

GitHub import discovery must not fail the whole import session because one discovered `SKILL.md` has malformed frontmatter.

## Behavior

- Discovery parses each discovered `SKILL.md` frontmatter as YAML before applying the Agent Skills contract.
- If one `SKILL.md` has malformed YAML, that candidate remains visible in the import modal with `status: invalid`.
- Malformed frontmatter candidates show a red disabled row labeled `Format error` with the specific YAML/frontmatter reason.
- Valid candidates from the same GitHub repository/session remain importable.
- Existing invalid skill reasons, such as missing `name` or mismatched directory name, still disable only that candidate.

## Verification

```bash
cd app && node --import tsx --test src/lib/github-import.test.ts src/app/dashboard/github-import-modal.test.tsx
cd app && npm test
```
