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
- The markdown editor does not show or directly edit the YAML frontmatter. It
  receives only the markdown body.
- The right-side Frontmatter form shows the package `name` as read-only and owns
  `description` editing. It recomposes those fields into `SKILL.md` before the
  file is saved or published.
- Agent-authored `SKILL.md` edits are rejected unless the file has explicit YAML
  frontmatter with required `name` and `description` fields.
- `name` must satisfy the Agent Skills constraints and match the skill package
  directory. For GitHub-imported skills, the package directory is the last
  segment of the original imported skill root.
- Publish context creation and final draft publication validate the root
  `SKILL.md` before any published package is emitted.
- Validation errors include the failing condition and link to
  `https://agentskills.io/specification`.

## Verification

- `app/src/lib/skills/skill-files.test.ts` covers the generated file content.
- `app/src/lib/skills/skill-frontmatter.test.ts` covers frontmatter parsing,
  body extraction, recomposition, and required Agent Skills validation.
- `app/src/lib/skills/repository.test.ts` covers save-time and publish-time
  package validation.
- `app/src/app/dashboard/page.test.tsx` guards against the old fallback
  instructional body returning in the dashboard editor surface.
