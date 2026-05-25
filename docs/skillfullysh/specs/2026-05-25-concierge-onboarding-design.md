# Concierge Onboarding Landing Design

**Date:** 2026-05-25
**Status:** Approved for implementation
**Approval basis:** Direct user request to switch the public acquisition flow from signup to concierge onboarding.

## Goal

Make the public landing page book-onboarding first. Visitors should see `Book onboarding` as the main call to action, existing users should still be able to log in, and signup language should disappear from the landing page.

## Scope

- Keep the authenticated dashboard and login routes unchanged.
- Replace landing-page signup CTAs with booking CTAs.
- Add an embedded Google Calendar appointment scheduler on the landing page.
- Keep guide/blog navigation and the current editorial visual system.
- Update render coverage so the landing page contract catches signup regressions.

## UX Contract

- Header: brand, guide/blog links, `Log in`, and a primary `Book onboarding` CTA.
- Hero: primary CTA is `Book onboarding`; secondary CTA remains the guide.
- Dashboard preview: avoid suggesting self-serve signup; use login/open-dashboard language.
- Footer CTA: invite users to book onboarding instead of creating a workspace.
- Booking section: show the Google Calendar appointment scheduler in a bordered editorial frame with a clear section heading.

## Implementation Notes

- Use an in-page `#book-onboarding` anchor for booking CTAs.
- Embed the scheduler with the provided Google Calendar Appointment Scheduling iframe URL.
- Keep the iframe responsive with `width="100%"`, `height="600"`, `frameBorder="0"`, and a descriptive `title`.
- Preserve landing analytics for login links; booking anchors can be plain links because they do not authenticate.

## Verification

- Update `app/src/app/page.test.tsx` to assert the booking CTA, iframe URL, login-only auth intent, and absence of signup language.
- Run `cd app && node --import tsx --test src/app/page.test.tsx`.
- Run `cd app && npm run build`.
