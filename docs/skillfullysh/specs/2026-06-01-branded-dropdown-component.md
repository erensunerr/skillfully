# Branded Dropdown Component

**Date:** 2026-06-01
**Approval basis:** Direct user request to correct inconsistent dropdown arrows, alignment, and styling

## Goal

Create a single reusable dropdown/select component so dashboard dropdowns share one arrow, one height system, one focus treatment, and one disabled style.

## Decisions

- Add `BrandedSelect` and `DropdownChevron` under `app/src/components`.
- Keep `react-select` for the richer app select behavior already used in the dashboard.
- Centralize border, background, type, menu, option, cursor, disabled, and focus styles in the component.
- Use one CSS chevron for the shared select component and the custom skill selector button.
- Replace native permission `<select>` controls in the Share dialog and collaborator list.
- Replace the local dashboard `react-select` wrapper with `BrandedSelect`.
- Leave MDXEditor toolbar internals alone; they are third-party editor controls already scoped by editor CSS.

## Verification

```bash
cd app && node --import tsx --test src/components/branded-select.test.tsx src/app/dashboard/page.test.tsx
cd app && npm run lint
cd app && npm test
cd app && npm run build
```
