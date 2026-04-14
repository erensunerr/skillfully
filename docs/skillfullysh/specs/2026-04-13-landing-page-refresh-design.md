# Skillfully Landing Page Refresh Design

**Date:** 2026-04-13
**Status:** Approved and implemented
**Approval basis:** Direct user instruction to replace the landing page with the supplied editorial reference
**Source of truth:** This document

## Goal

Replace the current landing page with an editorial, monochrome system-inspired page that matches the supplied reference while preserving the existing Next.js app structure and routing.

## Approved Content

- Hero eyebrow: `OBJ: Agent skills analytics`
- Hero headline: `Know which of your AGENT SKILLS work — and which don't.`
- Hero body: `Every time an agent uses your skill, it posts a self-assessment back. You see ratings and feedback without lifting a finger. Expose the blind spots in your AI's tooling.`
- Primary CTA: `Start collecting feedback`
- Process section title: `Three Steps`
- Footer CTA title: `Ready to stop guessing?`
- Footer CTA body: `Join a small group of early adopters building better skills with real feedback.`

## Constraints

- Keep the work inside the existing Next app under `app/`.
- Keep real app destinations instead of placeholder links:
  - login and primary CTA continue to point at `/dashboard`
  - footer utility link points at `/docs`
- Implement the reference in React/Tailwind/global CSS instead of embedding raw HTML.
- Ensure the page remains responsive on mobile, tablet, and desktop.

## Visual Direction

- Palette: off-white paper background, near-black foreground, grayscale accents.
- Typography:
  - serif accent for the editorial and italic headline moments
  - sans for structural headings
  - mono for metadata, labels, and system copy
- Atmosphere: print-layout grid, drafting marks, subtle noise texture, halftone overlays, schematic hero illustration, barcode rail.

## Page Structure

1. Header with system metadata, centered brand treatment, and login CTA.
2. Split hero:
   - left: eyebrow, headline, supporting copy, primary CTA
   - right: grid-backed schematic illustration with barcode/meta rail
3. Social-proof marquee strip.
4. Three-step process cards.
5. Footer CTA section with halftone treatment and compact footer bar.

## Implementation Notes

- Use `next/font/google` to swap from Geist-only branding to a serif/sans/mono mix closer to the reference.
- Put reusable decorative styles in `app/src/app/globals.css`.
- Keep the page component self-contained unless a helper improves clarity.
- Add a lightweight render test that asserts the new headline and key sections render.
- Preserve the reference visually, but distill it into repo-owned markup and CSS rather than depending on the temporary attachment file.

## Verification

- `node --import tsx --test src/app/page.test.tsx`
- `npm run build`
- Run the local app and inspect with the browse workflow at desktop and mobile widths.
