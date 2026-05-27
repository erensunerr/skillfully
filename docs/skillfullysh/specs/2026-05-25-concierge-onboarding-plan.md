# Concierge Onboarding Landing Plan

**Date:** 2026-05-25

## Task 1: Lock the Landing Contract in Tests

- Modify: `app/src/app/page.test.tsx`
- Add assertions for `Book onboarding`, modal trigger surfaces, no initial Google Calendar iframe, and login-only auth intent.
- Add modal render coverage for the Google Calendar appointment scheduler URL.
- Add assertions that signup copy and `data-auth-intent="sign_up"` no longer render.
- Verify the test fails before implementation.

## Task 2: Update Landing Page CTAs and Booking Modal

- Modify: `app/src/app/page.tsx`
- Create: `app/src/app/booking-modal.tsx`
- Replace signup CTAs with booking modal buttons.
- Keep login links pointing at `/dashboard`.
- Remove the booking section and keep the original landing-page section order.
- Add the provided iframe inside the modal.
- Adjust surrounding copy from self-serve workspace creation to concierge onboarding.
- Verify the focused landing test passes.

## Task 3: Record Project Memory and Verify

- Modify: `docs/skillfullysh/memories/2026-05-25-memory.md`
- Modify: `docs/skillfullysh/memories/TOC.md`
- Record the concierge onboarding change.
- Run the focused render test and production build.
- Commit and push the atomic change set.
