# Private Link Use Sharing

**Date:** 2026-06-01
**Status:** Implemented
**Approval basis:** Direct user request for an optional share checkbox

## Goal

Let owners and editors make a private skill usable by anyone who has the install link, without granting edit access or making the skill public.

## Decisions

- Add an `Anyone with link can use.` checkbox to the editor share dialog for private skills.
- Store the setting on the skill as `anyoneWithLinkCanUse` and mint a high-entropy `linkUseToken` for the share URL.
- When enabled for a private skill, the unified `/api/skills/<skillId>/manifest?share=<token>`, `/files/...?share=<token>`, and `/install?share=<token>` routes serve the latest published release without bearer auth.
- Disable link access to clear the token and revoke that anonymous link. Authenticated users with use or edit access can still use the non-token `/api/skills/<skillId>/...` routes.
- Keep dashboard editor, analytics, settings, collaborator lists, draft files, and mutation routes protected by existing owner/edit rules.
- Keep `/api/public/skills/...` as public-only compatibility routes; link-use private skills use the unified `/api/skills/...` URLs.

## Verification

```bash
cd app && node --import tsx --test src/app/api/skills/[skillId]/route.test.ts src/app/dashboard/page.test.tsx src/lib/skills/repository.test.ts
cd app && npm run lint
cd app && npm test
cd app && npm run build
git diff --check
```
