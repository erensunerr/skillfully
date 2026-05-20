# Editor Settings Privacy Fixes

**Date:** 2026-05-20
**Status:** Implemented

## Goal

Fix private publish semantics and remove product friction in the skill editor and settings surfaces.

## Decisions

- Human-facing editor frontmatter does not expose version numbers.
- Publishing a private skill creates the next frozen release without changing the skill to public.
- Private skills publish through Skillfully only. Directory and GitHub publishing rows are hidden for private skills.
- Public skills can still use the existing public publish destinations.
- Settings owns the skill visibility control with explicit `Private` and `Public` choices.
- Archive and reset analytics controls are removed.
- Skill deletion is owner-only and deletes the skill plus owned versions, files, targets, publish runs, directory submissions, sharing grants, invite notifications, usage events, and feedback.
- Editor file management supports creating non-root markdown files and deleting non-root markdown or asset files.
- Root `SKILL.md` remains protected from deletion.
- Markdown table editing is exposed in the MDX editor toolbar.

## Verification

```bash
cd app && npm run lint
cd app && npm test
```
