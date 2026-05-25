# Concierge Onboarding Landing Plan

**Date:** 2026-05-25

## Task 1: Lock the Landing Contract in Tests

- Modify: `app/src/app/page.test.tsx`
- Add assertions for `Book onboarding`, `#book-onboarding`, the Google Calendar appointment scheduler URL, and login-only auth intent.
- Add assertions that signup copy and `data-auth-intent="sign_up"` no longer render.
- Verify the test fails before implementation.

## Task 2: Update Landing Page CTAs and Booking Section

- Modify: `app/src/app/page.tsx`
- Replace signup CTAs with booking anchors.
- Keep login links pointing at `/dashboard`.
- Add the booking section with the provided iframe.
- Adjust surrounding copy from self-serve workspace creation to concierge onboarding.
- Verify the focused landing test passes.

## Task 3: Record Project Memory and Verify

- Modify: `docs/skillfullysh/memories/2026-05-25-memory.md`
- Modify: `docs/skillfullysh/memories/TOC.md`
- Record the concierge onboarding change.
- Run the focused render test and production build.
- Commit and push the atomic change set.
