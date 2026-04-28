# Functional Skill Publishing

**Date:** 2026-04-27
**Status:** Approved
**Approval basis:** User approved the backend-first architecture and clarified GitHub publishing behavior

## Goal

Turn the dashboard's UI-only skill authoring and publishing surfaces into real product behavior. Skillfully is the canonical skill workspace; GitHub and skill directories are publish targets.

## Architecture

- InstantDB remains the primary application database for skills, versions, files, publishing state, GitHub installations, and analytics/feedback records.
- Instant Storage stores skill files and assets. Text file contents are also mirrored into `skillFiles.contentText` for editor performance and conflict-free route updates.
- Next.js route handlers own privileged mutations. The client reads with Instant where useful, but creation, file editing, imports, publishing, and GitHub sync go through API routes.
- Publishing runs through adapter interfaces. GitHub App publishing is the first automated adapter; LobeHub, ClawHub, and Hermes initially produce submission packets and status records until their API contracts are known.

## GitHub Model

- If a user creates a skill without importing a repository, publishing targets `erensunerr/skillfully-skills` and writes into `skills/<skill-slug>/...`.
- The Skillfully GitHub App must be installed on `erensunerr/skillfully-skills`; Skillfully stores that installation id as the default internal installation.
- If a user imports from GitHub, the user installs the Skillfully GitHub App on selected repos. Each detected skill becomes its own Skillfully skill, preserving the original skill name/frontmatter.
- Before Skillfully writes update or analytics excerpts back into imported skills, it asks the author for explicit consent. Consent is tracked per imported skill/target.

## Data Model

- Add `$files` for Instant Storage.
- Extend `skills` with slug/status/visibility/source metadata and draft/published version pointers.
- Add `skillVersions`, `skillFiles`, `publishingTargets`, `publishRuns`, `directorySubmissions`, `githubInstallations`, `githubRepositories`, and `skillImports`.
- Index every field used by route queries or dashboard filters: owner ids, skill ids, version ids, status, target kind, repo names, installation ids, timestamps, and file keys.

## Route Model

- Keep `/skills` and `/feedback/[skillId]` compatible with existing agent API behavior.
- Add `/api/dashboard/skills` for authenticated dashboard skill creation.
- Add `/api/dashboard/skills/[skillId]` for skill metadata reads/updates.
- Add `/api/dashboard/skills/[skillId]/files` and `/api/dashboard/skills/[skillId]/files/[fileId]` for file listing, text updates, and uploads.
- Add `/api/dashboard/skills/[skillId]/publish` for publish orchestration.
- Add `/api/dashboard/skills/[skillId]/targets/[targetKind]` for target settings and consent.
- Add `/api/github/callback` and `/api/github/webhook` for GitHub App installation state.
- Add `/api/public/skills/[skillId]/manifest` and `/api/public/skills/[skillId]/files/[...path]` for public install surfaces.

## Error Handling

- Missing dashboard auth returns `401`.
- Cross-owner access returns `404`.
- Missing GitHub configuration creates a failed publish run with an actionable error, rather than pretending publish succeeded.
- Directory adapters can return `manual_ready` with a generated packet instead of failing when no public API exists.

## Verification

- Unit tests cover file path normalization, manifest generation, GitHub default/user target selection, and publish orchestration.
- Route tests cover dashboard creation and file publishing responses where practical.
- Full verification uses `npm test` and `npm run build` from `app/`.
