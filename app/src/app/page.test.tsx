import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("landing page renders the refreshed editorial messaging", async () => {
  Object.assign(globalThis, { React });
  const { LandingPageContent } = await import("./page");
  const html = renderToStaticMarkup(<LandingPageContent variant="control" />);

  assert.match(html, /THE PLATFORM FOR BUILDING BETTER AGENT SKILLS/);
  assert.match(html, /AGENT SKILL QA AND ANALYTICS/);
  assert.match(html, /Agent skills are easy to publish\. Hard to improve\./);
  assert.match(html, /See which skills are actually being used/);
  assert.match(html, /Understand why agents fail/);
  assert.match(html, /A feedback loop for every agent skill/);
  assert.match(html, /Common questions/);
  assert.match(html, /Book onboarding/);
  assert.match(html, /data-booking-surface="header"/);
  assert.match(html, /data-booking-surface="hero"/);
  assert.match(html, /data-booking-surface="footer_cta"/);
  assert.doesNotMatch(html, /id="book-onboarding"/);
  assert.doesNotMatch(html, /calendar\.google\.com\/calendar\/appointments\/schedules/);
  assert.match(html, /\/dashboard/);
  assert.match(html, /data-auth-intent="sign_in"/);
  assert.doesNotMatch(html, /data-auth-intent="sign_up"/);
  assert.doesNotMatch(html, /Sign up/);
  assert.match(html, /data-auth-surface="header"/);
  assert.match(html, /data-auth-surface="footer"/);
  assert.match(html, /\/guide/);
  assert.match(html, /\/blog/);
  assert.match(html, /data-magnetic-cursor-area="hero-illustration"/);
  assert.match(html, /data-magnetic-layer="center"/);
  assert.match(html, /data-magnetic-layer="geometry"/);
  assert.match(html, /data-magnetic-layer="background"/);
  assert.match(html, /data-dot-spotlight-area="footer-cta"/);
  assert.match(html, /data-dot-spotlight-layer="overlay"/);
  assert.doesNotMatch(html, new RegExp(`/${["do", "cs"].join("")}`));
});

test("booking modal renders the appointment scheduler when opened", async () => {
  Object.assign(globalThis, { React });
  const { BOOKING_FORM_SRC, BookingModalCta } = await import("./booking-modal");
  const html = renderToStaticMarkup(
    <BookingModalCta surface="test" className="editorial-button" initialOpen>
      Book onboarding
    </BookingModalCta>,
  );

  assert.match(html, /role="dialog"/);
  assert.match(html, /Book concierge onboarding/);
  assert.doesNotMatch(html, />Concierge onboarding</);
  assert.match(html, /aria-label="Close onboarding booking"/);
  assert.match(html, new RegExp(BOOKING_FORM_SRC.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("booking click analytics has one canonical event", async () => {
  const source = await readFile(new URL("./booking-modal.tsx", import.meta.url), "utf8");

  assert.match(source, /meeting_booking_clicked/);
  assert.match(source, /createPortal\(modal, document\.body\)/);
  assert.doesNotMatch(source, /landing_booking_cta_clicked/);
});
