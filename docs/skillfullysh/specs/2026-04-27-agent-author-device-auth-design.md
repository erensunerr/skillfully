# Agent Author Device Auth And Managed Skill Instructions

**Date:** 2026-04-27
**Status:** Approved for implementation
**Approval basis:** User requested device-code auth for author agents, author-agent editing APIs, and Skillfully-owned feedback/update instructions appended to every skill.

## Goal

Make Skillfully usable by all three stakeholders:

- Human skill authors use the dashboard to create, edit, import, publish, and approve connected agents.
- Agent skill authors authenticate through a device-code flow and then use a simple API to create, edit, publish, and inspect skills.
- Agent skill users always receive Skillfully-owned feedback and update instructions inside the published `SKILL.md`, without making that block user-editable in the dashboard editor.

## Architecture

- Device-code auth uses a standard two-step flow:
  - The author agent creates a pending device authorization and receives `device_code`, `user_code`, `verification_uri`, and `verification_uri_complete`.
  - The human signs in to Skillfully, enters or follows the code, and approves the agent for the signed-in account.
  - The agent polls with `device_code` and receives a bearer token scoped to that human owner id.
- Device-issued bearer tokens are stored in the existing `apiTokens` entity with `userId` set to the dashboard owner id. This keeps the public token resolver usable while avoiding a second token table.
- `agentDeviceCodes` stores pending/approved/denied/consumed device auth attempts. Only route handlers can create or read it.
- New `/api/agent/*` routes expose the real Skillfully authoring model, not the older tracked-skill-only model:
  - skill list/create/detail/update
  - draft file list/create/update
  - publish
  - analytics summary
- Dashboard routes remain human-session oriented. Agent author routes use device-issued bearer tokens.
- Co-editing means both the dashboard and agent API mutate the same draft skill/version/file records. Dashboard users see agent changes after the next file load or navigation refresh.

## Managed Skill Block

Skillfully owns a generated markdown block delimited by stable comments:

- `<!-- skillfully:managed:start -->`
- `<!-- skillfully:managed:end -->`

The editable draft file stored in Skillfully excludes this block. The editor shows the block as a locked panel, not inside the editable MDX editor.

The block is appended automatically when a `SKILL.md` file leaves Skillfully:

- public file API
- manifest hashing
- GitHub publishing
- manual directory submission packets
- agent API install/read surfaces

The block includes:

- required feedback submission instructions
- exact `POST /feedback/<skillId>` JSON shape
- strict rating rules
- update-check instructions using the public manifest endpoint
- file URL pattern for loading published files

Imported GitHub skills still preserve author content. Consent controls whether Skillfully may write the managed block back to the source repo, but public Skillfully install surfaces always append it for agents consuming Skillfully-hosted published skills.

## API Model

- `POST /api/agent/auth/device` creates a device authorization.
- `POST /api/agent/auth/device/token` polls and exchanges an approved device code for a bearer token.
- `POST /api/agent/auth/device/approve` is called from the signed-in human approval page.
- `GET /api/agent/skills` lists the owner's skills.
- `POST /api/agent/skills` creates a full draft skill.
- `GET /api/agent/skills/[skillId]` returns skill, draft version, files, targets, and install URLs.
- `PATCH /api/agent/skills/[skillId]` updates name/description/visibility metadata.
- `GET /api/agent/skills/[skillId]/files` lists draft files.
- `POST /api/agent/skills/[skillId]/files` creates a text draft file.
- `PATCH /api/agent/skills/[skillId]/files/[fileId]` updates a text draft file.
- `POST /api/agent/skills/[skillId]/publish` publishes through the same adapters as the dashboard.
- `GET /api/agent/skills/[skillId]/analytics` returns feedback totals, rating split, recent feedback, publish runs, and directory submissions.

## Verification

- Unit tests cover managed block stripping/appending and manifest hashes.
- Unit tests cover device-code creation, approval, token polling, and token ownership.
- Existing repository tests prove publish still freezes versions and opens the next draft.
- Full verification uses `npm test` and `npm run build` from `app/`.
