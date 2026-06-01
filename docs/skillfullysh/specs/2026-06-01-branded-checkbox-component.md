# Branded Checkbox Component

**Date:** 2026-06-01
**Approval basis:** Direct user request to make checkboxes consistently use a pointer cursor

## Goal

Create one reusable checkbox component for dashboard UI so checkbox controls are visibly interactive, on brand, and not reimplemented by hand.

## Decisions

- Add a `BrandedCheckbox` component under `app/src/components`.
- Keep a native `input type="checkbox"` for accessibility and form semantics.
- Put `cursor-pointer` on both the clickable label wrapper and the input hit area.
- Put `cursor-not-allowed` on disabled checkboxes and dim disabled labels.
- Use the Skillfully dashboard visual system: black ink borders, paper/white surfaces, editorial sans text, and a filled ink check state.
- Replace the current dashboard share checkbox and GitHub import candidate checkbox with the component.

## Verification

```bash
cd app && node --import tsx --test src/components/branded-checkbox.test.tsx src/app/dashboard/page.test.tsx src/app/dashboard/github-import-modal.test.tsx
cd app && npm run lint
cd app && npm test
cd app && npm run build
```
