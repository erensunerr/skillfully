# Skillfully Dashboard Reference Redesign

**Date:** 2026-04-26
**Status:** Implemented
**Approval basis:** Direct user instruction to redo the dashboard like the supplied reference image
**Reference image:** `.context/attachments/ChatGPT Image Apr 26, 2026, 06_19_50 PM.png`

## Goal

Replace the older high-contrast dashboard UI with a monochrome operational dashboard that matches the supplied reference. This change is UI-only: no InstantDB schema changes, no route changes, and no new persistence behavior.

## Content Contract

- Sidebar with Skillfully brand, skill selector, `Overview`, `Editor`, `Analytics`, `Settings`, user email, and sign out.
- Skill header with selected skill name, real draft/published status, `Go to Editor`, and `Copy installation prompt`.
- Overview metrics derived from submitted feedback only: success rate and feedback received.
- `Usage over time` renders an empty state until runtime usage events exist.
- `Feedback sentiment` derives percentages from real feedback and renders a no-feedback state when empty.
- `Recent feedback` table.
- `Publishing & directory status` describes configured adapter capabilities without fake published versions.
- `Version snapshot` reflects stored draft/published version ids, or an empty state.

## Visual Direction

- Use the landing page's monochrome editorial system: paper background, black rules, restrained green/red/amber status accents, and large sans-serif metric typography.
- Keep the layout product-like and scannable, not marketing-like.
- Use real UI controls for the skill selector, editor entry point, copy action, date-range selector, tables, and status rows.
- Keep dashboard cards un-nested and separated by thin borders.
- Preserve the existing onboarding modal and create-skill flow, restyling only the surrounding dashboard shell.

## Behavior Scope

- The dashboard still reads the existing `skills` and `feedback` entities through the existing InstantDB hooks.
- Creating skills still uses the existing `db.transact` path.
- The copy action still uses the existing feedback template and clipboard behavior.
- `Go to Editor` opens the existing create/edit surface for now.
- Analytics, publishing, and version sections must not seed demo data. They render real data from InstantDB when available and explicit empty/configuration states otherwise.

## Responsiveness

- Desktop uses a fixed left sidebar and a wide content canvas similar to the reference.
- Mobile stacks the sidebar above the content without forcing a full viewport sidebar.
- Large tables and the usage chart scroll horizontally inside their panels instead of creating page-level overflow.
