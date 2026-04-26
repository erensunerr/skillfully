# Skillfully Dashboard Reference Redesign

**Date:** 2026-04-26
**Status:** Implemented
**Approval basis:** Direct user instruction to redo the dashboard like the supplied reference image
**Reference image:** `.context/attachments/ChatGPT Image Apr 26, 2026, 06_19_50 PM.png`

## Goal

Replace the older high-contrast dashboard UI with a monochrome operational dashboard that matches the supplied reference. This change is UI-only: no InstantDB schema changes, no route changes, and no new persistence behavior.

## Content Contract

- Sidebar with Skillfully brand, skill selector, `Overview`, `Editor`, `Analytics`, `Settings`, user email, and sign out.
- Skill header with selected skill name, `v2.3.0`, `Published`, `Go to Editor`, and `Copy installation prompt`.
- Overview metrics for `Success rate` and `Active users`.
- Large `Usage over time` chart with date-range selector.
- `Skill health` checklist with uptime, error rate, p95 response time, successful runs, failed runs, and safety incidents.
- `Needs attention` and `Feedback sentiment` panels.
- `Recent feedback` table.
- `Publishing & directory status` targets.
- `Version snapshot` table.

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
- Analytics, publishing, and version data are visual placeholders until the real data model is added later.

## Responsiveness

- Desktop uses a fixed left sidebar and a wide content canvas similar to the reference.
- Mobile stacks the sidebar above the content without forcing a full viewport sidebar.
- Large tables and the usage chart scroll horizontally inside their panels instead of creating page-level overflow.
