# Private Skill Sharing And Collaboration

**Date:** 2026-05-19
**Status:** Approved for implementation planning
**Approval basis:** User approved the route-owned access layer, unified install surface, editor-panel sharing UI, agent sharing API, Resend invite notifications, and Instant schema push requirement.

## Goal

Let Skillfully authors share skills privately without publishing to GitHub or making them public. Shared users and their connected agents can receive explicit `use` or `edit` permissions. `use` serves only frozen releases. `edit` includes `use`, can edit drafts, publish releases, and manage non-owner sharing permissions.

## Domain Decisions

- `use` access serves frozen Skillfully releases only. It never exposes the draft.
- `edit` access implies `use`, can publish, and can grant or revoke access for any non-owner account.
- The skill owner has implicit edit/use access and cannot be revoked by another editor.
- Access is granted immediately to a normalized email address. The email invite is a notification and entry point, not an acceptance gate.
- If invite email delivery fails, the access grant remains active and the UI/API returns a warning.
- Revocation stops Skillfully from serving current or future releases to the revoked account. Already-copied local files are outside product control.
- Publishing creates one immutable Skillfully release. The skill's visibility and access grants decide who can retrieve it.
- Versions are ordinal integers. The first publish creates version `1`; each later publish increments by one.
- Public visibility does not clear the share list. If the skill later becomes private again, existing grants still apply.
- Use-only dashboard users can see shared skills but cannot see editor, analytics, settings, or the share list.
- Editors can see editor, analytics, settings, publishing, and non-owner sharing controls.
- API mutation routes use `skill_id`. Agents resolve human-provided names by listing visible skills first.

## Data Model

InstantDB remains the primary database. Add indexed entities for grants and notification attempts:

- `skillAccessGrants`
  - `ownerId`: skill owner id for owner-scoped queries.
  - `skillId`: public skill id such as `sk_...`.
  - `granteeEmail`: normalized email address.
  - `granteeUserId`: optional Instant user id when known.
  - `permission`: `use` or `edit`.
  - `status`: `active` or `revoked`.
  - `createdByUserId`, `revokedByUserId`.
  - `createdAt`, `updatedAt`, `revokedAt`.
- `skillInviteNotifications`
  - `ownerId`, `skillId`, `grantId`.
  - `toEmail`, `fromUserId`.
  - `deliveryStatus`: `sent` or `failed`.
  - `resendEmailId`, `error`.
  - `createdAt`, `updatedAt`.

Extend version/release data to support integer release numbers. Keep `skillVersions.id` as the row id, but treat `skillVersions.version` as a stringified integer or add an indexed numeric `versionNumber` during implementation if that keeps compatibility simpler. Published releases remain immutable and the next draft carries the next publish number.

Every field used in `where` or `order` clauses must be indexed before pushing schema.

## Shared Access Service

Create a shared module, likely `app/src/lib/skills/access.ts`, that owns all permission decisions:

- `resolveSkillAccess({ userId, email, skillId })`
- `requireSkillUseAccess(...)`
- `requireSkillEditAccess(...)`
- `grantSkillAccess(...)`
- `revokeSkillAccess(...)`
- `listSkillAccess(...)`

This module is the only place that interprets owner, edit, use, revoked, and email-based grants. Dashboard routes and agent routes must call it rather than duplicating access checks.

Access resolution returns one of:

- `owner`
- `edit`
- `use`
- `none`

`owner` and `edit` satisfy edit and use checks. `use` satisfies only release/install checks. `none` cannot see private skills and should be serialized as not found for private resources.

## Routes

Keep the existing split between dashboard and agent routes. This is already the codebase convention: dashboard routes authenticate browser users, and agent routes authenticate bearer author tokens. Both route families should stay thin wrappers around the shared access service.

Unified install routes:

- `GET /api/skills/[skillId]/manifest`
- `GET /api/skills/[skillId]/files/[...path]`
- `POST /api/skills/[skillId]/install`

Install behavior:

- Public skills serve anonymously.
- Private skills without auth return `401`.
- Private skills with valid auth but no access return `404`.
- Private skills with `use`, `edit`, or owner access serve the latest release.
- Authorized users with access to an unreleased private skill receive a clear no-release response without exposing draft files.

Keep existing `/api/public/skills/...` routes as public-only compatibility wrappers during migration. New prompts and docs should use `/api/skills/...`.

Dashboard sharing routes:

- `GET /api/dashboard/skills/[skillId]/access`
- `POST /api/dashboard/skills/[skillId]/access`
- `PATCH /api/dashboard/skills/[skillId]/access/[grantId]`
- `DELETE /api/dashboard/skills/[skillId]/access/[grantId]`

Agent sharing routes:

- `GET /api/agent/skills/[skillId]/access`
- `POST /api/agent/skills/[skillId]/access`
- `DELETE /api/agent/skills/[skillId]/access/[grantId]`

POST grants `use` or `edit` to a normalized email and attempts a Resend invite. DELETE revokes a non-owner grant. PATCH can change `use` to `edit` or `edit` to `use` for dashboard users; if the agent API does not need PATCH in the first implementation, agents can revoke and recreate instead.

## Email Delivery

Use Resend for invite notifications.

- Add the dependency with `npm install resend`.
- Read `RESEND_API_KEY` from the environment.
- Send from `eren@skillfully.sh`.
- Email failure does not roll back access.
- Responses should include a warning when the grant succeeds but notification delivery fails.

The email should identify the skill, the permission granted, who shared it, and link to the Skillfully dashboard or install surface.

## Dashboard UI

Shared skills appear in the skill selector/list with a marker such as `Shared with you` or `Owned by <email>`.

The editor panel gets the primary `Share` button for owners and editors. The share dialog supports:

- entering an email address,
- selecting `use` or `edit`,
- sending the invite/grant,
- listing current grants for owners/editors,
- changing permission where supported,
- revoking any non-owner grant.

Use-only shared skills should show install/release information but hide:

- editor,
- analytics,
- settings,
- share list and collaborator emails.

Editors can see:

- editor,
- analytics,
- settings,
- publishing,
- share controls.

The owner cannot be removed or downgraded.

## Agent Skill

Update `skills/skillfully/SKILL.md` to document sharing from a connected agent:

- list visible skills,
- resolve a human-provided skill name to an exact `skill_id`,
- grant `use` or `edit` access by email,
- revoke a non-owner grant,
- handle email-delivery warnings separately from access success.

The skill should make clear that mutation APIs accept `skill_id`, not ambiguous names.

## Permissions

Instant permissions should keep privileged entities locked down unless there is a concrete client-side read need. Route handlers use the admin SDK for grant creation, invite notification records, install serving, and authoring operations.

If dashboard client queries need direct visibility into grants, expose only the minimum needed fields and rely on field-level rules where practical. Use-only users must not be able to read the share list.

After implementation, push both schema and permissions:

```bash
npx instant-cli push schema --yes
npx instant-cli push perms --yes
```

## Error Handling

- Missing dashboard auth returns `401`.
- Missing agent bearer token returns the existing agent API auth error shape.
- Private skill without auth on install routes returns `401`.
- Private skill with valid auth but no access returns `404`.
- Attempts to revoke or downgrade the owner fail.
- Use-only attempts to edit, publish, view analytics, view settings, or manage access fail.
- Resend failures return success with a warning because access was already granted.

## Verification

- Unit-test shared access resolution:
  owner implicit edit/use, edit implies use, use cannot edit, editor can grant/revoke non-owner access, owner cannot be revoked, revoked access stops serving.
- Route-test dashboard and agent sharing wrappers:
  both route families call the same service behavior, normalize emails, use `skill_id`, and return warnings on Resend failure.
- Route-test install access:
  public anonymous success, private no-auth `401`, private no-access `404`, private `use`/`edit` success, unreleased private access response.
- Dashboard-test shared skill rendering:
  selector marker, use-only hidden editor/analytics/settings/share list, editor surfaces visible.
- Update and validate `skills/skillfully/SKILL.md`.
- Run from `app/`:
  `npm test`
  `npm run build`
- Run `git diff --check`.
- Push Instant schema and permissions.
