# GitHub Skill Import Implementation Plan

**Status:** Implemented

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Completed steps are checked below.

**Goal:** Build the GitHub import flow from onboarding install through selectable skill import and GitHub-managed publishing metadata.

**Architecture:** Keep GitHub API access in server-side route/helpers. Add a pure discovery/validation helper with focused tests, extend repository metadata for GitHub imports, then wire a dashboard modal that calls the import-session API. Existing publishing adapter continues to create PRs for `autoMerge=false` imported skills.

**Tech Stack:** Next.js App Router route handlers, React dashboard components, InstantDB admin writes, Node `node:test`, GitHub REST API.

---

## Chunk 1: Discovery And Repository Metadata

### Task 1: Add pure GitHub import discovery helpers

**Files:**
- Create: `app/src/lib/github-import.ts`
- Test: `app/src/lib/github-import.test.ts`

- [x] Write failing tests for valid skill discovery, invalid spec rows, duplicate rows, relative paths, and file size caps.
- [x] Run `cd app && node --import tsx --test src/lib/github-import.test.ts` and verify failure.
- [x] Implement strict Agent Skills frontmatter validation and candidate discovery helpers.
- [x] Run the focused test and verify pass.

### Task 2: Persist durable GitHub import metadata

**Files:**
- Modify: `app/src/instant.schema.ts`
- Modify: `app/src/lib/skills/repository.ts`
- Test: `app/src/lib/skills/repository.test.ts`

- [x] Write failing repository tests for imported skills storing `originalRepositoryId` and GitHub targets storing `repositoryId`.
- [x] Run `cd app && node --import tsx --test src/lib/skills/repository.test.ts`.
- [x] Add optional durable GitHub ids to schema/types/createSkillDraft.
- [x] Run focused repository tests.

## Chunk 2: Server Import Flow

### Task 3: Create import sessions from GitHub callback

**Files:**
- Modify: `app/src/app/api/github/callback/route.ts`
- Modify: `app/src/instant.schema.ts`
- Test: `app/src/lib/github-import.test.ts`

- [x] Write failing session tests where the browser receives `github_import=<sessionId>` instead of a trusted raw installation id.
- [x] Implement `skillImports` session creation tied to owner and installation.
- [x] Run the focused callback tests.

### Task 4: Add dashboard import-session API

**Files:**
- Replace or extend: `app/src/app/api/dashboard/github/import/route.ts`
- Test: `app/src/lib/github-import-service.test.ts`
- Test: `app/src/lib/github-import.test.ts`

- [x] Write failing service tests for candidate discovery and selected skill import.
- [x] Implement GET for candidate discovery and POST for selected imports.
- [x] Store repos in `githubRepositories`, skip duplicates, import files relative to skill root, and update import session status.
- [x] Run focused API tests.

## Chunk 3: Dashboard Modal

### Task 5: Add GitHub import modal UI

**Files:**
- Create: `app/src/app/dashboard/github-import-modal.tsx`
- Test: `app/src/app/dashboard/github-import-modal.test.tsx`

- [x] Write failing render tests for loading, candidate picker, invalid/already-imported states, and no-skills state.
- [x] Implement modal component using the existing onboarding visual scale.
- [x] Run focused modal tests.

### Task 6: Wire modal into dashboard

**Files:**
- Modify: `app/src/app/dashboard/page.tsx`
- Test: `app/src/app/dashboard/page.test.tsx`

- [x] Write failing dashboard tests for modal affordances and import action copy.
- [x] Add query-param driven import session state, automatic candidate load, selected import submit, close/dismiss behavior, and redirect to first imported skill.
- [x] Run focused dashboard tests.

## Chunk 4: Finish

### Task 7: Documentation and verification

**Files:**
- Modify: `docs/skillfullysh/memories/2026-05-08-memory.md`
- Modify: `docs/skillfullysh/memories/TOC.md`

- [x] Record the GitHub import implementation memory and update the TOC.
- [x] Run `cd app && npm run lint`.
- [x] Run `cd app && npm test`.
- [x] Run `cd app && npm run build`.
- [x] Commit and push the atomic change set.
