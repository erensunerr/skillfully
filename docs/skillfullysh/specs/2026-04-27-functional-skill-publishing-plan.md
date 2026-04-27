# Functional Skill Publishing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development if explicitly requested by the user, otherwise use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Skillfully skills persist files, publish versions, and sync to GitHub or directory targets.

**Architecture:** Add focused service modules behind Next.js route handlers. InstantDB stores skill metadata, versions, files, targets, GitHub installs, and publish runs; Instant Storage stores file blobs.

**Tech Stack:** Next.js App Router route handlers, InstantDB React/Admin SDKs, Instant Storage, GitHub App installation tokens, Node test runner.

---

## Chunk 1: Backend Model And Pure Services

### Task 1: Schema And Permissions

**Files:**
- Modify: `app/src/instant.schema.ts`
- Modify: `app/src/instant.perms.ts`

- [x] Add `$files`, skill versioning, file, publishing target, publish run, directory submission, GitHub installation, GitHub repository, and import entities.
- [x] Add path-based `$files` permissions and owner-based entity rules.
- [x] Run `cd app && npm test`.

### Task 2: File And Manifest Utilities

**Files:**
- Create: `app/src/lib/skills/skill-files.ts`
- Test: `app/src/lib/skills/skill-files.test.ts`

- [x] Write failing tests for slug/path normalization, default `SKILL.md`, manifest generation, and update excerpt consent insertion.
- [x] Implement utilities.
- [x] Run focused tests.

### Task 3: Publishing Adapters

**Files:**
- Create: `app/src/lib/publishing/types.ts`
- Create: `app/src/lib/publishing/adapters/github-app.ts`
- Create: `app/src/lib/publishing/adapters/manual-directory.ts`
- Create: `app/src/lib/publishing/publish.ts`
- Test: `app/src/lib/publishing/publish.test.ts`

- [x] Write failing tests for default Skillfully repo selection, imported repo selection, consent gating, and publish status transitions.
- [x] Implement adapters and orchestration.
- [x] Run focused tests.

## Chunk 2: Routes And Dashboard Wiring

### Task 4: Dashboard Auth And Routes

**Files:**
- Create: `app/src/lib/dashboard-auth.ts`
- Create: `app/src/app/api/dashboard/skills/route.ts`
- Create: `app/src/app/api/dashboard/skills/[skillId]/route.ts`
- Create: `app/src/app/api/dashboard/skills/[skillId]/files/route.ts`
- Create: `app/src/app/api/dashboard/skills/[skillId]/files/[fileId]/route.ts`
- Create: `app/src/app/api/dashboard/skills/[skillId]/publish/route.ts`
- Create: `app/src/app/api/dashboard/skills/[skillId]/targets/[targetKind]/route.ts`

- [x] Add authenticated route handlers for create, read/update, file list/create/update/upload, target settings, and publish.
- [x] Return stable JSON contracts for the dashboard.
- [x] Run route/service tests.

### Task 5: Public And GitHub Routes

**Files:**
- Create: `app/src/app/api/public/skills/[skillId]/manifest/route.ts`
- Create: `app/src/app/api/public/skills/[skillId]/files/[...path]/route.ts`
- Create: `app/src/app/api/github/webhook/route.ts`
- Create: `app/src/app/api/github/callback/route.ts`

- [x] Add public manifest/file reads for published versions.
- [x] Add GitHub App webhook signature verification and installation persistence.
- [x] Add callback handling for installation setup redirects.

### Task 6: Dashboard Integration

**Files:**
- Modify: `app/src/app/dashboard/page.tsx`
- Modify: `app/src/app/dashboard/onboarding-modal.tsx`
- Modify: `app/src/app/dashboard/page.test.tsx`

- [x] Replace direct create-skill transactions with `/api/dashboard/skills`.
- [x] Persist editor file edits through file routes.
- [x] Trigger publish through `/api/dashboard/skills/[skillId]/publish`.
- [x] Add GitHub import and consent states without losing current local preview behavior.

## Chunk 3: Verification And Docs

### Task 7: Documentation And Memory

**Files:**
- Modify: `docs/skillfullysh/memories/2026-04-27-memory.md`
- Modify: `docs/skillfullysh/memories/TOC.md`

- [x] Record the functional publishing/backend pass.
- [x] Run `cd app && npm test`.
- [x] Run `cd app && npm run build`.
- [x] Commit and push one atomic change set.
