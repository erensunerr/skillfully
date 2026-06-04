---
title: How to Publish an Agent Skill to GitHub
subtitle: A practical GitHub workflow for packaging, reviewing, versioning, and shipping a reusable agent skill without confusing repository distribution with runtime learning.
category: Skill publishing
publishedAt: 2026-06-03
readTime: 10 min read
author: tau-valerius
nextSlug: how-to-test-an-agent-skill
---

## How do you publish an agent skill to GitHub?

Publish the skill as a version-controlled folder, not as a loose prompt in a README.

A good GitHub publishing workflow has six parts:

1. package the skill around a valid `SKILL.md`
2. keep references, scripts, and assets in the same folder
3. store it at a stable repo path
4. open a pull request instead of pushing straight to main
5. use tags or releases when you want a public version boundary
6. keep update checks and runtime feedback outside GitHub if the skill needs to improve after real runs

That last point matters. GitHub is excellent for version control, review, and distribution. It is not, by itself, a runtime feedback system. GitHub’s own docs focus on pull request reviews and releases, while the open Agent Skills ecosystem defines skills as reusable folders with `SKILL.md`, optional scripts, references, and assets. [GitHub PR reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews) · [GitHub releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) · [Agent Skills spec](https://github.com/agentskills/agentskills)

This article is mainly for **developer relations and technical enablement teams** who want a clean publishing workflow others can install and trust. It is also useful for **experts making skills** who want their workflow knowledge to live in a repo with proper review and version history.

If you are still writing the skill itself, start with [How to Write an Agent Skill That Actually Works](/blog/how-to-write-an-agent-skill). If you need to test it before release, read [How to Test an Agent Skill Before You Publish It](/blog/how-to-test-an-agent-skill).

## Why GitHub is useful for skill publishing

GitHub already solves several hard publishing problems well:

- **version control** for every change to the skill
- **pull request review** before changes merge
- **issues and discussions** for public feedback and maintenance
- **releases and tags** when you want a stable published version
- **repository visibility and linking** when you want the skill to be discoverable by humans

OpenAI’s Codex docs describe a skill as a directory with a required `SKILL.md` plus optional `scripts/`, `references/`, and `assets/`, and the open Agent Skills standard uses the same core folder model. [OpenAI Codex skills](https://developers.openai.com/codex/skills) · [Agent Skills spec](https://github.com/agentskills/agentskills)

## What GitHub solves, and what it does not solve

| GitHub is good at | GitHub is not good at by itself | Why it matters |
| --- | --- | --- |
| storing the skill folder and full edit history | telling a running agent whether its local copy is stale | distribution is not the same as runtime update enforcement |
| collecting code review in pull requests | collecting structured post-run feedback after every real task | PR comments are too sparse for operational learning |
| tagging or releasing versions | deciding whether a specific run was positive, neutral, or negative | you still need a runtime feedback contract |
| making the repo public and linkable | proving the skill actually worked in the wild | repo state is not execution evidence |
| preserving supporting files and scripts | measuring repeated failures across many runs | GitHub issues are too manual for that loop |

This is the most important framing for the article: **GitHub is a publishing layer, not the whole lifecycle**.

That distinction lines up with both the ecosystem and Skillfully’s own product behavior. In Skillfully’s public code, GitHub-imported skills keep their original repository and path metadata, and publishing creates a pull request back to the source repository instead of silently mutating main. The same product also adds a managed runtime block for manifest checks and feedback submission, because GitHub alone does not provide that execution-time loop. See [`github-import-service.test.ts`](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/github-import-service.test.ts), [`publish.test.ts`](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/publishing/publish.test.ts), [`install-prompts.ts`](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/skills/install-prompts.ts), and [`agent-api.ts`](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/agent-api.ts).

## What to put in the repository before you publish

Before you open a PR, make sure the repo version of the skill is shaped like a skill, not a random notes folder.

At minimum, include:

- `SKILL.md` with valid metadata
- any supporting `references/`
- any executable `scripts/`
- any templates or static resources in `assets/`
- a stable directory path that will not move every week

A simple layout looks like this:

```text
skills/
  code-review/
    SKILL.md
    references/
      review-checklist.md
    scripts/
      check.sh
    assets/
      output-template.md
```

That structure is not arbitrary. OpenAI’s Codex docs say the skill directory contains `SKILL.md` and optional support folders, and Claude Code docs make the same point about reusable instructions living in `SKILL.md` with supporting files around them. [OpenAI Codex skills](https://developers.openai.com/codex/skills) · [Claude Code skills](https://code.claude.com/docs/en/skills)

Skillfully’s own GitHub import implementation uses this same shape operationally. Its discovery logic treats a candidate as a `SKILL.md` file inside a skill root, imports the files under that root, preserves relative paths, and keeps the original skill path for later publishing. That is a strong first-party reason to publish the whole folder cleanly, not just the main markdown file. [GitHub import design](https://github.com/erensunerr/skillfully/blob/main/docs/skillfullysh/specs/2026-05-08-github-import-design.md)

## A 6-step workflow for publishing an agent skill to GitHub

### 1. Freeze the skill into one stable folder

Pick one permanent path.

Do not publish the skill from a scratch area like:

- `notes/skill-draft-final-final/`
- `tmp/agent-skill/`
- `misc/prompts/`

A stable path matters because agents, humans, and import systems all need a durable root. The open Agent Skills format assumes a folder boundary around the skill. [Agent Skills spec](https://github.com/agentskills/agentskills)

If the skill is repo-specific, a path like `.agents/skills/<skill-name>/` is sensible. If it is meant to be shared more broadly, a top-level `skills/<skill-name>/` directory is easier for humans to browse.

### 2. Validate `SKILL.md` metadata before you publish

Your skill should not rely on a human reviewer spotting broken metadata by eye.

At minimum, verify:

- the file starts with YAML frontmatter
- `name` exists
- `description` exists
- the directory name matches the skill name if your runtime expects that

This is not theoretical. Skillfully’s own validation tests reject missing frontmatter, missing `name`, mismatched directory names, and missing `description` in `SKILL.md`. That mirrors the Agent Skills spec requirement that the file include at least `name` and `description`. [Skillfully skill frontmatter tests](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/skills/skill-frontmatter.test.ts) · [Agent Skills spec](https://github.com/agentskills/agentskills)

A practical rule: if the metadata is too weak for discovery, publishing it faster does not help.

### 3. Open a pull request, not a direct push

GitHub’s biggest publishing advantage is review.

According to GitHub’s docs, pull request reviews let collaborators comment, approve, or request changes before merge. Repository administrators can even require approvals before merging. [GitHub PR reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews)

That makes a PR the right release gate for skills because reviewers can check things a quick demo misses:

- whether the skill description is clear enough to trigger correctly
- whether the truth path is explicit
- whether the stop rules are safe
- whether helper scripts or references actually belong with the skill
- whether the skill is too broad and should be split

For DevRel teams, this is especially important. A published skill may get copied into demos, docs, and customer workflows. A sloppy direct push can become a support burden.

### 4. Preserve the full skill package, not only `SKILL.md`

A common publishing mistake is to commit `SKILL.md` and forget the rest.

But a real skill often depends on:

- examples
- checklists
- helper scripts
- policy references
- output templates

OpenAI and the Agent Skills spec both treat those support files as first-class parts of the skill package. [OpenAI Codex skills](https://developers.openai.com/codex/skills) · [Agent Skills spec](https://github.com/agentskills/agentskills)

Skillfully’s GitHub import flow reinforces this with real product behavior. Imported files are stored relative to the skill root, and publish plans write them back under that same root. In the tests, an imported `.agents/skills/code-review` package keeps both `SKILL.md` and `scripts/check.sh`, and the GitHub write plan preserves dot-prefixed roots instead of flattening them. [GitHub import service tests](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/github-import-service.test.ts) · [publish tests](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/publishing/publish.test.ts)

### 5. Use tags or releases when you need a clean version boundary

GitHub docs are explicit that releases are how you bundle and deliver project iterations to users. GitHub also lets you draft releases, generate release notes, attach files, and mark a release as a pre-release. [GitHub releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)

For agent skills, releases are useful when you want to say one of these clearly:

- this is the stable public version
- this version changed behavior in a meaningful way
- consumers should pin or review this iteration

You do not need a release for every tiny edit. But if the skill is used outside your immediate team, releases make change boundaries much easier to communicate.

### 6. Add a runtime update and feedback layer outside GitHub

This is where many publishing guides stop too early.

A GitHub repo can tell you what changed in the source. It does not automatically tell a running agent:

- whether its local copy is outdated
- whether a real task succeeded or failed
- what broke most often after release

Skillfully’s public install and feedback code shows one practical answer. The install prompt tells the agent to check the latest manifest before each use, and the managed block requires exactly one feedback payload after the run with `positive`, `negative`, or `neutral` plus a short explanation. That is a runtime loop, not a repo loop. [install-prompts.ts](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/skills/install-prompts.ts) · [agent-api.ts](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/agent-api.ts)

If your skill matters in production, GitHub should be where you review and publish changes. A separate runtime system should be where you learn from actual usage.

## A first-party Skillfully example: GitHub is the source repo, not the whole product

Skillfully’s own GitHub flow is a useful model because it stays honest about what GitHub is good for.

From the public specs and tests:

- a valid imported skill keeps its original `repositoryId`, `repoFullName`, and `skillRoot`
- GitHub-managed publishing targets keep `autoMerge = false`
- publishing creates a PR back to the source repository and path
- missing installation access or missing publish-target consent blocks publishing instead of guessing

That design says something important: **GitHub is the authoritative source of the skill package, while Skillfully adds update checks, publishing context, and runtime feedback on top**. See [`github-import-design.md`](https://github.com/erensunerr/skillfully/blob/main/docs/skillfullysh/specs/2026-05-08-github-import-design.md), [`github-publishing-target-authorization.md`](https://github.com/erensunerr/skillfully/blob/main/docs/skillfullysh/specs/2026-05-29-github-publishing-target-authorization.md), and [`publish.test.ts`](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/publishing/publish.test.ts).

That is the fairest answer to the search intent behind this article:

- yes, publish the skill to GitHub
- no, do not confuse GitHub with the whole operating layer

## Common mistakes when publishing skills to GitHub

### Mistake 1: publishing a prompt instead of a skill

If the repo only contains one vague markdown file with no clear structure, you have probably published a prompt-shaped artifact, not a reusable skill.

### Mistake 2: storing the skill at an unstable path

If the folder keeps moving, downstream users and tooling will break.

### Mistake 3: pushing to main without review

A skill can fail through bad metadata, weak boundaries, or missing support files. PR review catches a lot of that cheaply.

### Mistake 4: using GitHub releases as a substitute for runtime learning

A release tells people what version exists. It does not tell you how the skill behaved in the wild.

### Mistake 5: forgetting the supporting files

If the skill relies on `references/`, `scripts/`, or `assets/`, those belong in the publish flow too.

## Pre-publish checklist for a GitHub skill release

Use this checklist before you open the PR:

- [ ] The skill lives in one stable folder.
- [ ] `SKILL.md` has valid frontmatter with at least `name` and `description`.
- [ ] The folder includes all required references, scripts, and assets.
- [ ] The path is the one you want agents and users to rely on long term.
- [ ] The skill has been tested on a realistic happy path.
- [ ] The publish change is going through a pull request.
- [ ] A version tag or release plan exists if this is a meaningful public version.
- [ ] There is a runtime update check if consumers may hold stale copies.
- [ ] There is a runtime feedback path if the skill should improve after release.

## FAQ

### Should every agent skill be published to GitHub?

No. GitHub is great when you want version control, review, and public or team distribution. If the skill is highly private or only useful in one controlled environment, another distribution path may make more sense.

### What is the best repo path for an agent skill?

Use a stable, obvious folder. Common patterns are `skills/<skill-name>/` for shared catalogs and `.agents/skills/<skill-name>/` for repo-local skills.

### Is a GitHub release required for every skill update?

No. Use normal commits and pull requests for routine edits. Use tags or releases when you need a clear public version boundary.

### Can GitHub alone tell me whether the skill is working after release?

Not reliably. GitHub can show issues, PR comments, and commits, but it does not give you structured post-run feedback from every execution. If you care about improvement over time, add a runtime feedback loop.

## Suggested internal links and next steps

To strengthen the publishing cluster, pair this article with:

- [How to Write an Agent Skill That Actually Works](/blog/how-to-write-an-agent-skill)
- [How to Test an Agent Skill Before You Publish It](/blog/how-to-test-an-agent-skill)
- [Agent Skills vs Prompts](/blog/agent-skills-vs-prompts)
- [What Is an Agent Skill?](/blog/what-is-an-agent-skill)

The practical next move is simple: put one real skill in a stable folder, validate its `SKILL.md`, open a PR, and treat GitHub as the publishing layer. Then add a separate update and feedback loop if you want the skill to get better after real use.

## References

- [OpenAI Codex skills documentation](https://developers.openai.com/codex/skills)
- [Claude Code skills documentation](https://code.claude.com/docs/en/skills)
- [Agent Skills specification](https://github.com/agentskills/agentskills)
- [GitHub docs: pull request reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews)
- [GitHub docs: managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
- [Skillfully guide content](https://github.com/erensunerr/skillfully/blob/main/app/src/content/guide.ts)
- [Skillfully GitHub import design](https://github.com/erensunerr/skillfully/blob/main/docs/skillfullysh/specs/2026-05-08-github-import-design.md)
- [Skillfully GitHub publishing target authorization spec](https://github.com/erensunerr/skillfully/blob/main/docs/skillfullysh/specs/2026-05-29-github-publishing-target-authorization.md)
- [Skillfully install prompt builder](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/skills/install-prompts.ts)
- [Skillfully managed feedback API](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/agent-api.ts)
