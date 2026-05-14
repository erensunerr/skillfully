# Dashboard Install Prompts

**Date:** 2026-05-13
**Status:** Implemented

## Requirement

The dashboard must distinguish the prompt for installing Skillfully's authoring
skill from the prompt for installing a user's published skill.

## Behavior

- Before a skill is published, the dashboard overview shows one secondary
  action: `Install Skillfully Skill`.
- That action copies exactly:
  `Install the skillfully skill from erensunerr/skillfully on github.`
- After a skill is published, the dashboard overview keeps `Install Skillfully
  Skill` and also shows `Install <skill-name>`.
- `Install <skill-name>` copies the same user-skill install prompt that appears
  in the post-publish modal.
- The default user-skill prompt starts with:
  `Install <skill-name> from erensunerr/skillfully-skills on github.`
- Imported GitHub skills continue to preserve their source repository and skill
  path in the user-skill prompt.
- The old dashboard feedback-template fetch and public template asset are no
  longer part of this flow.

## Verification

- `app/src/lib/skills/install-prompts.test.ts` covers exact prompt text.
- `app/src/app/dashboard/page.test.tsx` covers draft and published dashboard
  button visibility.
