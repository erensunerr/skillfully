# Default Skill Frontmatter

**Date:** 2026-05-13
**Status:** Implemented

## Requirement

New empty skills must produce a valid Agent Skills `SKILL.md` before the author
adds body instructions.

## Behavior

- `SKILL.md` starts with YAML frontmatter.
- Frontmatter includes required `name` and `description` fields.
- `name` is normalized to the Agent Skills slug format and capped at 64
  characters.
- `description` uses the provided skill description when present and otherwise
  uses a non-empty placeholder so the frontmatter stays publishable.
- The default body is empty. Skillfully no longer seeds the old "When to use" or
  workflow fallback instructions.
- The dashboard editor fallback follows the same frontmatter-only shape.

## Verification

- `app/src/lib/skills/skill-files.test.ts` covers the generated file content.
- `app/src/app/dashboard/page.test.tsx` guards against the old fallback
  instructional body returning in the dashboard editor surface.
