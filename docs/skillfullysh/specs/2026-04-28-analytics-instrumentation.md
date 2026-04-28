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

## Verification

- `npm test` passed with dashboard coverage for populated usage charts and runtime event tables.
- `npm run build` passed with the new public route instrumentation and author-agent analytics API.
- `npx instant-cli push schema --yes` created the remote `skillUsageEvents` namespace and indexes.
- `npx instant-cli push perms --yes` updated remote permissions so clients can only view owner-scoped usage events.

## Known Limits

- `subjectHash` is best-effort and absent for server component page-view events that do not receive a `NextRequest`.
- Events currently count public Skillfully surfaces, not downstream agent invocations outside Skillfully.
- DAU/WAU/churn views can be derived from `dayKey` and `subjectHash`, but the dashboard currently exposes event counts and recent events only.
