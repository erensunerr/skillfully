# Landing Page Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Skillfully landing page with the approved editorial landing page design while keeping existing app routes intact.

**Architecture:** Update the app shell fonts and global theme tokens, replace `src/app/page.tsx` with a componentized version of the approved layout, and add a lightweight render test so the new marketing copy is covered by a RED-GREEN loop. A small compatibility fix in the dynamic feedback route is included because it blocked `next build` under Next.js 15.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS v4, `next/font/google`, Node test runner with `tsx`

---

## Workflow Status

- Existing Conductor workspace `/Users/erens/conductor/workspaces/skillfully-v1/jackson` served as the isolated workspace for this change, so no additional `git worktree` was created.
- Design doc and memory files were created first under `docs/skillfullysh/...`.
- TDD RED/GREEN was executed for the landing page test.
- Doc-review feedback was requested and incorporated.
- Final browse QA, final code review, and branch-closeout remain the only open items in this plan.

## Chunk 1: Preflight And Test Harness

### Task 1: Establish test support and working context

**Files:**
- Modify: `app/package.json`
- Modify: `app/package-lock.json`
- Create: `docs/skillfullysh/specs/2026-04-13-landing-page-refresh-design.md`
- Create: `docs/skillfullysh/memories/2026-04-13-memory.md`
- Modify: `docs/skillfullysh/memories/TOC.md`

- [x] **Step 1: Use the existing isolated workspace**

Verified current workspace path and branch:

```bash
pwd
git branch --show-current
```

- [x] **Step 2: Install the TSX test runner**

Run:

```bash
cd app && npm install -D tsx
```

- [x] **Step 3: Add the page test script**

`app/package.json`

```json
"test": "node --import tsx --test"
```

- [x] **Step 4: Capture the approved design in repo docs**

Saved the approved content and layout notes in:

```text
docs/skillfullysh/specs/2026-04-13-landing-page-refresh-design.md
docs/skillfullysh/memories/2026-04-13-memory.md
docs/skillfullysh/memories/TOC.md
```

## Chunk 2: Landing Page TDD

### Task 2: Write the failing landing page render test

**Files:**
- Create: `app/src/app/page.test.tsx`
- Test: `app/src/app/page.test.tsx`

- [x] **Step 1: Write the failing test**

Test assertions use semantic copy and route presence:

- `Know which of your`
- `Three Steps`
- `Ready to stop guessing?`
- `/dashboard`

Implementation:

```tsx
assert.match(html, /Know which of your/);
assert.match(html, /Three Steps/);
assert.match(html, /Ready to stop guessing\?/);
assert.match(html, /\/dashboard/);
```

- [x] **Step 2: Run the test to watch it fail**

Run:

```bash
cd app && npm test -- src/app/page.test.tsx
```

Observed RED before implementation: the old landing page did not match the new editorial copy.

### Task 3: Implement the refreshed page

**Files:**
- Modify: `app/src/app/layout.tsx`
- Modify: `app/src/app/globals.css`
- Modify: `app/src/app/page.tsx`
- Modify: `app/src/app/feedback/[skillId]/route.ts`

- [x] **Step 1: Update the app shell fonts and metadata**

`app/src/app/layout.tsx`

- Replace Geist with:
  - `Space_Grotesk` as `--font-space-grotesk`
  - `JetBrains_Mono` as `--font-jetbrains-mono`
  - `Instrument_Serif` as `--font-instrument-serif`
- Update metadata title/description to match the new marketing page.

- [x] **Step 2: Replace the global theme primitives**

`app/src/app/globals.css`

- Replace dark background tokens with `--paper`, `--ink`, `--white`, `--gray`
- Add shared decorative classes:
  - `.marketing-noise`
  - `.editorial-halftone`
  - `.editorial-halftone-light`
  - `.corner-mark`
  - `.registration-mark`
  - `.vertical-rl`
  - `.editorial-marquee-track`

- [x] **Step 3: Replace the landing page markup**

`app/src/app/page.tsx`

- Implement:
  - header with system metadata and login CTA
  - split hero with approved headline/body copy
  - schematic SVG illustration and barcode rail
  - marquee social-proof band
  - three editorial step cards
  - dark footer CTA and compact footer bar

- [x] **Step 4: Repair the blocked production build**

`app/src/app/feedback/[skillId]/route.ts`

- Change the route context type to:

```ts
type RouteContext = { params: Promise<{ skillId: string }> };
```

- Await `params` inside `POST(...)` so the route matches Next.js 15 generated types.

- [x] **Step 5: Re-run the landing page test**

Run:

```bash
cd app && npm test -- src/app/page.test.tsx
```

Observed GREEN after implementation: `1 pass, 0 fail`.

## Chunk 3: Verification

### Task 4: Verify production behavior and polish

- [x] **Step 1: Run a production build**

Run:

```bash
cd app && npm run build
```

Observed GREEN after the route compatibility fix.

- [ ] **Step 2: Run the local app and inspect with browse**

Expected checks:

- desktop visual match to the approved editorial design
- mobile stacking and spacing remain clean
- no obvious console or network issues

- [x] **Step 3: Keep project docs in sync**

Updated:

```text
docs/skillfullysh/specs/2026-04-13-landing-page-refresh-design.md
docs/skillfullysh/specs/2026-04-13-landing-page-refresh-plan.md
docs/skillfullysh/memories/2026-04-13-memory.md
docs/skillfullysh/memories/TOC.md
```

## Chunk 4: Closeout

### Task 5: Review and branch completion

- [ ] Request final code review against the current diff.
- [ ] Present branch-finish options to the user after browse QA.
- [ ] If the user wants it, create one atomic commit for the completed change set.
