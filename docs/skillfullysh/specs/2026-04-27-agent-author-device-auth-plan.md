# Agent Author Device Auth And Managed Skill Instructions Plan

**Date:** 2026-04-27
**Status:** In implementation

## Tasks

1. Add `agentDeviceCodes` to `instant.schema.ts` and locked-down permissions.
2. Add managed-block helpers for stripping, rendering, and appending Skillfully-owned feedback/update instructions.
3. Update default skill creation, publish context, public manifest, and public file serving so `SKILL.md` is stored editable but emitted with the managed block.
4. Add device auth service functions and route handlers for start, approve, and token polling.
5. Add `/agent-auth` approval page for humans, using existing Instant magic-code sign-in when needed.
6. Add `/api/agent/skills` routes for full author-agent create/list/detail/update/file/publish/analytics behavior.
7. Update dashboard editor to show the Skillfully-owned block as locked context outside the editable markdown surface.
8. Update tests, run `npm test`, run `npm run build`, then commit and push the branch.

## Route Files

- `app/src/app/api/agent/auth/device/route.ts`
- `app/src/app/api/agent/auth/device/approve/route.ts`
- `app/src/app/api/agent/auth/device/token/route.ts`
- `app/src/app/agent-auth/page.tsx`
- `app/src/app/api/agent/skills/route.ts`
- `app/src/app/api/agent/skills/[skillId]/route.ts`
- `app/src/app/api/agent/skills/[skillId]/files/route.ts`
- `app/src/app/api/agent/skills/[skillId]/files/[fileId]/route.ts`
- `app/src/app/api/agent/skills/[skillId]/publish/route.ts`
- `app/src/app/api/agent/skills/[skillId]/analytics/route.ts`

## Test Files

- `app/src/lib/skills/skill-files.test.ts`
- `app/src/lib/agent-device-auth.test.ts`
- existing repository and publishing tests
