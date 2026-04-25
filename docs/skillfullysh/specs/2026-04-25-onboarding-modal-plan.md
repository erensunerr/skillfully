# Onboarding Modal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first-run onboarding modal shown in the supplied reference images.

**Architecture:** Keep the behavior dashboard-local. Add a pure helper for default modal visibility, test it first, then add a client-side modal component wired to existing dashboard screen state.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS v4, Node test runner with `tsx`.

---

## Chunk 1: Onboarding Modal

### Task 1: Add modal visibility behavior

**Files:**
- Modify: `app/src/app/dashboard/view-state.ts`
- Modify: `app/src/app/dashboard/view-state.test.ts`

- [x] **Step 1: Write the failing test**

Add tests for `shouldShowOnboardingModalByDefault`:

```ts
assert.equal(shouldShowOnboardingModalByDefault({ skills: [] }), true);
assert.equal(shouldShowOnboardingModalByDefault({ skills: [{ id: "skill-1" }] }), false);
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- src/app/dashboard/view-state.test.ts`

- [x] **Step 3: Write minimal implementation**

Export `shouldShowOnboardingModalByDefault` from `view-state.ts` and return `skills.length === 0`.

- [x] **Step 4: Run test to verify it passes**

Run: `cd app && npm test -- src/app/dashboard/view-state.test.ts`

### Task 2: Implement the modal UI and interactions

**Files:**
- Modify: `app/src/app/dashboard/page.tsx`
- Create: `app/src/app/dashboard/onboarding-modal.tsx`
- Create: `app/src/app/dashboard/onboarding-modal.test.tsx`
- Create: `app/src/app/docs/page.tsx`
- Create: `app/src/app/docs/page.test.tsx`

- [x] **Step 1: Read current dashboard file immediately before editing**

Run: `sed -n '1,840p' app/src/app/dashboard/page.tsx`

- [x] **Step 2: Add `OnboardingModal`**

Create a dashboard-local component with import/create columns, close button, GitHub connecting/unavailable state, and guide link.

- [x] **Step 3: Wire modal state**

Initialize modal visibility from `shouldShowOnboardingModalByDefault({ skills })` once data has loaded, reopen it from the empty dashboard, and dismiss it when the user creates or selects a skill.

- [x] **Step 4: Add guide route and render coverage**

Create `/docs` so `Read the guide` lands on a real page, and add static render tests for the modal and guide page.

- [x] **Step 5: Verify reachable browser surfaces**

Use Playwright to check `/docs` at desktop and mobile sizes. The live authenticated dashboard modal is blocked locally until `NEXT_PUBLIC_INSTANT_APP_ID` is configured.

### Task 3: Verify and document

**Files:**
- Modify: `app/package.json`
- Modify: `docs/skillfullysh/memories/2026-04-25-memory.md`
- Modify: `docs/skillfullysh/memories/TOC.md`

- [x] **Step 1: Run tests**

Run: `cd app && npm test`

- [x] **Step 2: Run build**

Run: `cd app && npm run build`

- [x] **Step 3: Update memory docs**

Record the onboarding modal behavior and update the TOC.

- [x] **Step 4: Commit and push atomically**

Run:

```bash
git add docs/skillfullysh app/src/app/dashboard
git commit -m "feat: add onboarding modal"
git push
```
