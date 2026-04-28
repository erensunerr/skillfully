# Guide And Blog Design

**Date:** 2026-04-25
**Status:** Approved for implementation
**Approval basis:** Direct user instruction with Demand Curve guide screenshots as visual reference

## Goal

Turn the small `/guide` guide into a long-form guide surface that feels closer to the supplied Demand Curve examples, and add a separate `/blog` surface where Skillfully articles can be published.

## Visual Direction

- Keep Skillfully's black-and-white editorial brand, but borrow the guide mechanics from the reference:
  - thin announcement rail
  - simple top navigation
  - black guide hero
  - rounded horizontal step navigation
  - centered long-form article body
  - desktop table of contents rail
  - pale bottom "next up" band
- Use Skillfully copy and product-specific steps. Do not copy Demand Curve branding, authors, or article content.
- Keep the guide readable on mobile by stacking the step navigation and moving the table of contents into the content flow.

## Guide Structure

The `/guide` route should explain a first Skillfully setup as a sequence. This was later refined into separate article routes under `/guide/[slug]`.

1. Intro
2. Create
3. Install
4. Run
5. Read Feedback
6. Improve

The guide should end with a blog article handoff instead of another dashboard card.

## Blog Structure

- Add `/blog` as a separate article index.
- Add `/blog/[slug]` as a reusable article template.
- Store articles in a typed content module so new published articles can be added without changing route logic.
- Seed the blog with articles about writing better agent skills and measuring agent skill quality.

## Validation

- Add render tests for `/guide`, `/blog`, and article routes.
- Run the full test suite and production build.
- Browser-check `/guide`, `/blog`, and a blog article on desktop and mobile.
