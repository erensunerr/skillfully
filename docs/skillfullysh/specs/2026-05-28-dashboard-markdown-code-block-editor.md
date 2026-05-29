# Dashboard Markdown Code Block Editor

**Date:** 2026-05-28
**Status:** Implemented

## Diagnosis

The GitHub import for `erensunerr/marketingskills/skills/video` stored the full files:

- `SKILL.md`: imported as a complete markdown text file.
- `references/ai-video-prompting.md`: imported as a complete markdown text file.
- `evals/evals.json`: imported as a complete JSON text file.

The visible cutoff happened in the dashboard markdown editor. The affected files include fenced code blocks immediately after markdown sections such as `A strong video prompt follows this formula:`. The editor enabled inline code formatting but did not enable MDXEditor's fenced code block plugins, so markdown rendering appeared truncated around the first code fence.

## Behavior

- Dashboard markdown editing supports fenced code blocks in imported `SKILL.md` and reference markdown files.
- The editor exposes code block insertion and CodeMirror-backed code block editing.
- Existing frontmatter stripping only removes the root YAML frontmatter and preserves body horizontal rules and fenced code blocks.

## Verification

```bash
cd app && node --import tsx --test src/lib/skills/skill-frontmatter.test.ts src/app/dashboard/page.test.tsx
cd app && npm run lint
cd app && npm test
cd app && npm run build
```
