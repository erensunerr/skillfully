# GitHub Skill Import

**Date:** 2026-05-08
**Status:** Implemented

## Goal

Make onboarding GitHub import real: after a signed-in Skillfully user installs the Skillfully GitHub App, Skillfully finds valid Agent Skills in the just-returned installation, lets the user choose which skills to import, and stores imported skills as GitHub-managed skills that publish back through pull requests.

## User Flow

- The empty-dashboard onboarding modal keeps its `Connect GitHub` action.
- Dashboard GitHub-start actions call `/api/github/install` with an authenticated
  POST first, then navigate to the returned GitHub install URL. This keeps
  localhost/local-preview flows authenticated even though direct browser
  navigation cannot attach dashboard auth headers.
- GitHub installation returns to Skillfully with `installation_id` and signed `state`.
- The server verifies the signed Skillfully state, verifies the GitHub App installation with app credentials, stores the durable installation, creates a server-side import session, and redirects to `/dashboard?github_import=<sessionId>`.
- The dashboard opens a modal over the existing empty dashboard, matching the original onboarding modal footprint.
- The modal immediately shows `Finding skills in your GitHub repositories...` and checks only the installation that just returned.
- The modal lists discovered candidates as `<repo full name> - <skill name>`, unchecked by default.
- Invalid candidates remain visible with disabled checkboxes and a red `Invalid` status.
- Already imported candidates are disabled as `Already imported`.
- Importing selected rows shows a loading state and redirects to the first imported skill dashboard.
- If no valid skills are found, the modal shows a no-skills state with `Change repository access`, which starts GitHub installation again.

## GitHub Requirements

- Skillfully keeps email-code auth as the user identity system. GitHub is a connected repository installation, not an identity provider.
- The app uses GitHub App installation tokens only. Tokens are generated server-side as needed and are never sent to the browser.
- The browser receives only a Skillfully-created import session id, not a trusted raw installation id.
- The GitHub App should request the minimum repository permissions needed for this workflow: metadata read, contents read/write, and pull requests read/write.
- Installation and installation-repository webhooks keep durable installation/repository access fresh.
- Stored GitHub references include durable repository ids in addition to display names because repo names can change.

## Skill Discovery

- A candidate is any `SKILL.md` file whose path contains a `skills` path segment.
- The skill root is the directory containing that `SKILL.md`.
- The Agent Skills specification is authoritative:
  - `SKILL.md` must start with YAML frontmatter.
  - `name` is required, 1-64 characters, lowercase letters, numbers, and hyphens only, no leading/trailing hyphen, no consecutive hyphens.
  - `description` is required, non-empty, max 1024 characters.
  - `name` must match the parent directory name.
- Discovery uses repository trees where possible, handles truncated trees as a repo-level warning, and validates candidate `SKILL.md` files by fetching their contents.
- Installation repository pagination continues until GitHub returns a short page, so discovery does not stop after an arbitrary fixed repository count.

## Import Semantics

- Import every file under the selected skill root, not only `SKILL.md`.
- Store file paths relative to the skill root. Example: `.agents/skills/code-review/scripts/check.sh` becomes `scripts/check.sh` in Skillfully and publishes back under the original root.
- Keep `SKILL.md` as text content. Other text files are imported as text files; binary files are uploaded to Skillfully storage and represented as assets.
- Per GitHub platform limits, skip files larger than 100 MiB and cap imported content at 1 GiB per skill directory. Oversized files are reported in import results.
- Duplicate detection uses owner id plus `installationId + repositoryId + skillRoot`. Duplicates are not importable.
- Imported skills use `sourceMode = github_import`, store original repo/root/repository id, and set their GitHub publishing target to the source repo/root with `autoMerge = false`.

## Publishing Behavior

- Imported GitHub skills are shown as `Managed in GitHub` in settings.
- Publishing an imported GitHub skill creates a PR in the source repo and does not auto-merge.
- The publish UI tells the user to review and merge the pull request on GitHub.
- If the installation is missing, revoked, or lacks repo access, publishing fails with reconnect/change-access guidance and does not mark the skill published.

## Error States

- GitHub App configuration missing: show a configured error in the modal or dashboard.
- GitHub installation callback missing or invalid: redirect to dashboard with a GitHub error state.
- No repositories selected: show no-skills state with change-access action.
- No valid skills found: show no-skills state with invalid candidates, if any, and change-access action.
- Partial repository check failures: show discovered candidates plus a compact warning.
- Selecting nothing keeps import disabled.
- Partial imports: redirect if at least one skill imports; otherwise keep the modal open with errors.
