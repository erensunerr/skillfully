# Analytics Instrumentation

**Date:** 2026-04-28
**Status:** Implemented

## Goal

Make Skillfully analytics reflect real product activity instead of placeholder dashboard UI. The first pass tracks the public install/update surfaces that skill user agents touch and exposes those events to human authors and author agents.

## Event Model

Analytics events are stored in the InstantDB `skillUsageEvents` entity.

Fields:

- `ownerId`: dashboard owner for permission scoping.
- `skillId`: stable public skill id.
- `eventKind`: one of `public_page_view`, `manifest_checked`, `file_loaded`, or `feedback_received`.
- `versionId`: published version id when the event is tied to a published version.
- `path`: file path for file load events.
- `source`: route-level source identifier such as `public_manifest`, `public_file`, `public_skill_page`, or `feedback_api`.
- `subjectHash`: hash of request IP hash and user-agent when a request object is available.
- `dayKey`: UTC `YYYY-MM-DD` bucket for dashboard charts.
- `metadataJson`: small event-specific details, currently feedback rating.
- `createdAt`: millisecond timestamp.

The helper writes events through admin routes only. Client users can query owner-scoped events but cannot create, update, or delete them directly.

## Instrumented Surfaces

- `GET /skills/[skillId]` records `public_page_view`.
- `GET /api/public/skills/[skillId]/manifest` records `manifest_checked`.
- `GET /api/public/skills/[skillId]/files/[...path]` records `file_loaded`.
- `POST /feedback/[skillId]` records `feedback_received` after the feedback row is accepted.

Event writes use a safe wrapper so analytics failure does not break install, update, file, or feedback flows.

## Author Surfaces

- Dashboard queries `skillUsageEvents` alongside `skills` and `feedback`.
- Overview now shows total usage events, update checks, file loads, a seven-day usage chart, and an event mix.
- Analytics tab now shows runtime usage summary cards and a recent runtime event table.
- Author-agent analytics API now returns a `usage` block with totals, event-kind counts, unique subject count, and recent events.

## PostHog Funnel Events

The product funnel is tracked with explicit PostHog events:

- `landing_page_viewed`: anonymous visitor reached the landing page.
- `landing_auth_cta_clicked`: visitor clicked a landing `sign_in` or `sign_up` CTA. Properties include `intent` and `surface`.
- `auth_email_submitted`: dashboard auth form received a valid email.
- `auth_code_entered`: verification code field became non-empty.
- `auth_code_pasted`: verification code field received a paste event.
- `auth_code_submitted`: user submitted a verification code.
- `auth_code_verified`: magic-code auth succeeded and the user was identified.
- `skill_created`: dashboard or author-agent API created a skill. Properties include `is_first_skill` and `author_type`.
- `first_skill_created`: dashboard or author-agent API created the first skill for an account.
- `skills_imported`: dashboard import API imported skills from GitHub.
- `first_skill_imported`: GitHub import created the first skill for an account.
- `skill_published`: dashboard or author-agent publish route successfully published or prepared at least one target.
- `feedback_received`: a skill received accepted feedback.
- `analytics_viewed`: signed-in dashboard user viewed a skill analytics surface. Daily and weekly analytics usage can be measured as unique users over PostHog time windows.

## Verification

- `npm test` passed with dashboard coverage for populated usage charts and runtime event tables.
- `npm run build` passed with the new public route instrumentation and author-agent analytics API.
- `npx instant-cli push schema --yes` created the remote `skillUsageEvents` namespace and indexes.
- `npx instant-cli push perms --yes` updated remote permissions so clients can only view owner-scoped usage events.

## Known Limits

- `subjectHash` is best-effort and absent for server component page-view events that do not receive a `NextRequest`.
- Events currently count public Skillfully surfaces, not downstream agent invocations outside Skillfully.
- DAU/WAU/churn views can be derived from `dayKey` and `subjectHash`, but the dashboard currently exposes event counts and recent events only.
