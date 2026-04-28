# Skillfully Landing Page Reference Redesign

**Date:** 2026-04-26
**Status:** Implemented
**Approval basis:** Direct user instruction to redo the landing page like the supplied reference image
**Reference image:** `.context/attachments/ChatGPT Image Apr 26, 2026, 04_10_37 PM.png`

## Goal

Replace the older single-hero Skillfully landing page with a longer monochrome editorial product page that matches the supplied reference: header navigation, split hero, product dashboard preview, feature grid, persona section, feedback-loop steps, FAQ, dark CTA, and footer.

## Content Contract

- Header navigation: `Skills Guide`, `Blog`, `Sign in`, `Sign up`
- Hero eyebrow: `AGENT SKILL QA AND ANALYTICS`
- Hero headline: `THE PLATFORM FOR BUILDING BETTER AGENT SKILLS`
- Hero body: `Create, publish, monitor, and improve agent skills from one workspace. Skillfully gives every skill a feedback loop, so authors can see what agents use, where they fail, and what to improve next.`
- Primary CTA: `Sign up`
- Secondary CTA: `Read the Skills Guide`
- Problem section: `Agent skills are easy to publish. Hard to improve.`
- Feature titles:
  - `See which skills are actually being used`
  - `Understand why agents fail`
  - `Turn real feedback into better skills`
  - `Publish skills with more confidence`
- Downstream sections:
  - `Built for developers and domain experts`
  - `A feedback loop for every agent skill`
  - `Common questions`
  - `Stop guessing how your agent skills perform`

## Visual Direction

- Monochrome editorial system: off-white paper, near-black ink, grayscale product panels, thin rules, and sparse status color only inside product mockups.
- Header mirrors the reference with left logo, centered guide/blog nav, and right auth actions.
- First viewport is a two-column split with copy on the left and a code-native geometric schematic on the right.
- Product credibility comes from a dashboard preview and smaller usage, feedback, diff, and status panels.
- Sections continue as full-width bordered bands, not floating marketing cards.
- FAQ rows use native disclosure behavior so the plus interactions are real without a client component.

## Routes

- `/dashboard` remains the destination for sign in, sign up, and product actions.
- `/guide` is the guide destination.
- `/blog` is the article destination.
- No public product copy should link to or label a legacy guide route.

## Responsiveness

- Desktop preserves the reference's two-column hero and two-column feature grid.
- Mobile stacks the hero, product preview, feature panels, persona cards, and loop cards without horizontal scrolling.
- Text sizes use breakpoint-based Tailwind classes instead of viewport-scaled font sizes.
