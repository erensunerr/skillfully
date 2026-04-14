# AGENTS.md

## The Basic Workflow

This file defines mandatory, non-optional agent behavior.

- `brainstorming` - activates before writing code. Refines rough ideas through questions, explores alternatives, and presents the design in sections for validation. Saves a design document.
- `using-git-worktrees` - activates after design approval. Creates an isolated workspace on a new branch, runs project setup, and verifies clean test baseline.
- `writing-plans` - activates with approved design. Breaks work into bite-sized tasks (2–5 minutes each). Every task has exact file paths, complete code, and verification steps.
- `subagent-driven-development` or `executing-plans` - activates with plan. Dispatches fresh subagent per task with two-stage review (spec compliance, then code quality), or executes in batches with human checkpoints.
- `test-driven-development` - activates during implementation. Enforces RED-GREEN-REFACTOR: write a failing test, watch it fail, write minimal code, watch it pass, commit. Deletes code written before tests.
- `requesting-code-review` - activates between tasks. Reviews against the plan and reports issues by severity. Critical issues block progress.
- `finishing-a-development-branch` - activates when tasks are complete. Verifies tests, presents options (merge/PR/keep/discard), and cleans up worktree.

The agent checks for relevant skills before any task. Mandatory workflows, not suggestions.

All updates must be made atomically: each change set is committed and pushed as a single atomic commit.

When updating dependencies or package versions, ALWAYS use an `npm` command and NEVER modify version numbers directly in `package.json` or lockfiles by hand.

When editing any file that may have user changes, ALWAYS read the current contents of that file first and preserve those changes. NEVER modify a file that the user may have changed without re-reading it immediately before editing.

## Documentation Requirements

Documentation must mirror the actual directory structure. For each project:

- `docs/<project-name>/memories`
- `docs/<project-name>/memories/<date>-memory.md`
- `docs/<project-name>/memories/TOC.md`

`docs/<project-name>/memories/TOC.md` must be updated every time memories are touched. `memories/<date>-memory.md` files must also be updated. The agent must review relevant project memories before attempting any work.

For each project:

- `docs/<project-name>/specs`

This directory must include all relevant documentation, including design docs, requirements, and task lists. It must always be kept updated. Files in `specs` are never modified before first reviewing the current related `memories` and `specs` content.
