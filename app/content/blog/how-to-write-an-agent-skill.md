---
title: How to Write an Agent Skill That Actually Works
subtitle: A practical workflow for experts and technical enablement teams who want skills that agents can discover, run, and improve over time.
category: Skill authoring
publishedAt: 2026-05-24
readTime: 11 min read
author: tau-valerius
nextSlug: agent-skills-vs-prompts
---

## How do you write an agent skill that actually works?

Write the skill like a repeatable job, not like a clever paragraph.

A working agent skill usually does six things well:

1. names one repeatable job
2. makes the required inputs explicit
3. tells the agent where to look first
4. defines visible completion evidence
5. sets stop rules and boundaries
6. creates a feedback path so the skill can improve after release

That is the core difference between **writing a prompt** and **writing an agent skill**. OpenAI’s Codex documentation describes a skill as a package of instructions, resources, and optional scripts for a reusable workflow, while the open Agent Skills specification describes skills as folders centered on `SKILL.md` plus optional scripts, references, and assets. Claude’s SDK documentation uses the same idea: persistent filesystem artifacts that Claude can discover and invoke when relevant. [OpenAI Codex skills](https://developers.openai.com/codex/skills) · [Agent Skills spec](https://github.com/agentskills/agentskills) · [Claude SDK skills](https://code.claude.com/docs/en/agent-sdk/skills)

If you only remember one line from this article, make it this: **a prompt asks for an answer, but a skill defines a reusable operating procedure**.

This article is aimed primarily at **experts and operators who are turning real workflows into skills**, with **developer relations and technical enablement teams** as the secondary audience. Both groups need the same underlying discipline: the skill has to be discoverable, operational, and inspectable by someone other than its author.

If you still need the category definition first, start with [What Is an Agent Skill?](/blog/what-is-an-agent-skill). If you need the comparison against one-off prompting, read [Agent Skills vs Prompts](/blog/agent-skills-vs-prompts) next.

## Why “write a better prompt” is not enough

A lot of weak skills are really just long prompts with better branding.

They sound like this:

- “Help with product strategy.”
- “Review code and give feedback.”
- “Turn my expertise into useful outputs.”

Those are not skills yet. They are ambitions.

A skill becomes real when another person or another agent can recognize **when to use it, how to start, what counts as done, and what to do if the task cannot continue**.

That is exactly where Skillfully’s first-party guidance is useful. The public guide starts by telling authors to define the repeatable job before they worry about snippets, metrics, or sharing, and to name the job, the inputs, and the visible result. That is the right order because reusable skill quality comes from operational clarity, not from writing style alone. [Start with agent skills](/guide/start-with-agent-skills)

A good test is this: **could two different people ask for this job in different words and still expect the same workflow and output?** If the answer is yes, you probably have the beginning of a skill. If the answer is no, keep narrowing.

## What every working agent skill needs

Before you write the long body, define the contract.

Skillfully’s public guide sequence is unusually strong on this point. The guide article behind `design-the-skill-contract` focuses on trusted inputs, the first tools or files to inspect, completion evidence, stop rules, and the feedback prompt. Those are the pieces that turn a fuzzy idea into something an agent can actually execute. [Design the skill contract](/guide/design-the-skill-contract)

Here is the shortest useful version of that contract:

| Component | Weak version | Working version | Why it matters |
| --- | --- | --- | --- |
| Job | “Help with onboarding” | “Turn a new-user support thread into a step-by-step onboarding fix list” | Agents need a bounded unit of work |
| Inputs | “Use the context provided” | “Requires the support thread, product area, and current onboarding copy” | Prevents guessed assumptions |
| Truth path | “Investigate the issue” | “Read the thread first, then inspect `/app/onboarding`, then check analytics events” | Reduces wasted exploration |
| Completion evidence | “Return your findings” | “Return the broken step, affected file paths, proposed change, and how to verify it” | Makes success inspectable |
| Stop rules | “Ask if needed” | “Stop if the repo or account context is missing, or if the fix needs policy approval” | Prevents scope creep |
| Feedback | “Let us know how it went” | “After the task attempt, report outcome, blocker, and what instruction should change next” | Creates an iteration loop |

If your draft does not define most of those fields, it is probably still prompt-shaped.

## Bad skill vs better skill

Here is the pattern in a side-by-side example.

### Weak draft

> Analyze this customer interview and tell me what matters.

Why it fails:

- no specific audience or job
- no required inputs beyond “this interview”
- no output shape
- no proof of completion
- no rule for what to do if the transcript is incomplete

### Better draft

> Turn a customer interview transcript into a product-discovery memo for the product team. Use the transcript, current product area, and research goal. Read the transcript before opening any prior notes. Return the top pain points, exact supporting quotes, feature requests, and a short recommendation section. Stop if the transcript is missing speaker attribution or the research goal is absent. After the task attempt, report whether the memo was usable, what blocked the run, and which instruction should change next.

Why it works better:

- the job is named
- the inputs are explicit
- the inspection order is clear
- the output has a known shape
- the stop condition is visible
- the feedback loop is built in

This does **not** make the skill perfect. It makes it testable.

## A 7-step workflow for writing an agent skill

If you want a practical authoring system, use this one.

### 1. Name the job in one sentence

Use a format like this:

**For [audience], do [repeatable job] using [core inputs], and return [proof of completion].**

Example:

> For a sales team, turn a discovery-call transcript into objections, buying signals, next actions, and a follow-up email draft, using the transcript and account notes, and return the structured brief plus the draft.

If you cannot write this sentence cleanly, the skill is still too fuzzy.

### 2. Make the required inputs explicit

Separate **required inputs** from **useful context**.

Required inputs might include:

- file paths
- URLs
- repo names or IDs
- transcript text
- account notes
- a product area
- access to a specific tool or dashboard

This is one of the highest-leverage improvements you can make. A surprising amount of “agent unreliability” is really just **missing input discipline**.

### 3. Tell the agent where to look first

Good skills do not only say *what* to do. They improve the truth path.

If there is a fastest path to reality, name it.

Examples:

- read the failing test before reading the implementation
- inspect the customer complaint before opening analytics
- review the current landing page before drafting replacements
- for a DevRel workflow, read the docs issue first, then the affected guide page, then the demo repo or code sample
- read `README`, then `docs/`, then changed files

This mirrors how strong human operators work. They know where to look first.

### 4. Define visible completion evidence

Avoid endings like:

- “summarize what you found”
- “share recommendations”
- “provide the result”

Instead require proof that can be checked, such as:

- files changed
- commands run
- routes verified
- screenshots captured
- links opened
- a structured memo with named sections

Skillfully’s own guide pushes authors toward visible evidence for exactly this reason: feedback becomes much more useful when the result can be inspected. [Start with agent skills](/guide/start-with-agent-skills)

### 5. Add stop rules and boundaries

A skill that never stops is not robust. It is just polite.

Stop rules should tell the agent when to:

- halt because a required input is missing
- report partial progress
- escalate because the next step needs a human decision
- avoid changing something that is intentionally out of scope

This matters even more in DevRel and enablement workflows where skills may span repos, docs, demos, dashboards, and publishing systems.

### 6. Write the description for discovery

Descriptions are not decoration. They are part of skill discovery.

OpenAI’s Codex docs say the system starts with each skill’s **name, description, and file path**, then loads full instructions only when the skill is selected. The docs also note that when many skills are installed, descriptions may be shortened first to fit the initial skill list budget. Claude’s SDK docs make the same discovery point from another angle: the `description` is what helps Claude decide when to invoke the skill. [OpenAI Codex skills](https://developers.openai.com/codex/skills) · [Claude SDK skills](https://code.claude.com/docs/en/agent-sdk/skills)

That means the description should read like a trigger, not like brand copy.

Weak description:

> Helps teams move faster with better decisions.

Better description:

> Review a pull request for analytics regressions. Use when event tracking may have changed and you need changed files, missing events, and verification steps. Do not use for general code review.

That description is better because it tells the system and the human reviewer:

- what the skill does
- when to use it
- when not to use it

### 7. Add feedback before release

The first version should be narrow enough to survive contact with real use.

Skillfully’s public guidance is right to place feedback **after** the task attempt, not in the middle of the workflow. Feedback should arrive while execution context is still fresh, but it should not interrupt the job itself. [Install feedback collection](/guide/install-feedback-collection)

A small version released to real usage teaches more than a big imagined version that never gets run.

## A first-party Skillfully example: installation and feedback shape the skill contract

Skillfully’s codebase gives a useful operational example of what “a working skill” means in practice.

In [`install-prompts.ts`](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/skills/install-prompts.ts), the generated install prompt does more than say “install this skill.” It also tells the agent where the skill lives, which endpoint to call after install, and—most importantly—which manifest URL to check **before each use** so the agent can load the latest published files. That is a real workflow constraint, not generic prompt advice.

In [`agent-api.ts`](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/agent-api.ts), the default managed feedback block makes the contract even more explicit. The block requires the agent to submit **exactly one** feedback payload after the run, use one of three explicit ratings (`positive`, `negative`, or `neutral`), and check the manifest for changed files or version IDs before using the skill again.

That first-party example is helpful because it shows how a skill evolves past “good wording” into something operational:

| If you stop at the prompt | If you package the workflow as a real skill |
| --- | --- |
| The agent gets one set of instructions | The agent gets reusable operating instructions |
| Updates are easy to miss | The manifest check becomes part of normal use |
| Outcome quality is anecdotal | Feedback becomes structured and reviewable |
| Improvement depends on memory | Improvement can depend on repeated evidence |

That is the level most teams eventually need if they want reusable skills instead of isolated impressive runs.

If you want a practical next step, start with the smallest version that can collect evidence in the wild, then use Skillfully’s public guide sequence to tighten the contract and feedback loop after real runs. [Design the skill contract](/guide/design-the-skill-contract) · [Install feedback collection](/guide/install-feedback-collection)

## Common mistakes that make skills fail in real use

### Mistake 1: the skill is just a long prompt

Longer is not the same as better. If the file has no clear inputs, no proof of completion, and no stop rules, it is still prompt-shaped.

### Mistake 2: the job is too broad

“Help with growth,” “help with research,” and “help with hiring” are categories, not skills.

### Mistake 3: the description is too generic

If the description sounds like a slogan, discovery gets worse.

### Mistake 4: there is no truth path

If the skill does not tell the agent where to inspect first, the agent has to improvise search strategy every time.

### Mistake 5: feedback is treated like an afterthought

If you only learn from occasional praise or complaints, improvement stays anecdotal instead of systematic.

## Pre-publish checklist for a new agent skill

Before you publish, confirm all of these are true:

- [ ] the skill does one repeatable job
- [ ] the required inputs are explicit
- [ ] the first files, tools, or sources to inspect are named
- [ ] completion evidence is visible and checkable
- [ ] stop rules prevent unnecessary scope creep
- [ ] the description says when to use the skill and when not to use it
- [ ] the skill can collect feedback after a real run
- [ ] the first version is narrow enough to test quickly

If you cannot check most of that list, the skill probably needs another pass before release.

## FAQ

### What is the best format for an agent skill?

The best format is the one your target runtime can discover and execute reliably, but the common pattern is consistent: a required main instruction file plus optional references, scripts, and assets. OpenAI Codex, Claude’s SDK docs, and the Agent Skills specification all converge on that package shape. [OpenAI Codex skills](https://developers.openai.com/codex/skills) · [Claude SDK skills](https://code.claude.com/docs/en/agent-sdk/skills) · [Agent Skills spec](https://github.com/agentskills/agentskills)

### How is a skill different from a prompt template?

A prompt template helps with one class of outputs. A skill is closer to a reusable operating procedure with boundaries, completion evidence, and a lifecycle.

### How long should a skill be?

Long enough to define the job clearly, but short enough to stay operational. Put the main procedure in the core skill file and move heavy reference material into supporting files.

### Should every expert turn their framework into a skill?

No. The best candidates are workflows that repeat, can be inspected, and create value after multiple runs. One-off inspiration does not need a skill.

## References and next reads

External references:

- [OpenAI Codex: Agent Skills](https://developers.openai.com/codex/skills)
- [OpenAI prompt engineering guide](https://developers.openai.com/api/docs/guides/prompt-engineering)
- [Claude SDK skills documentation](https://code.claude.com/docs/en/agent-sdk/skills)
- [Agent Skills specification and docs](https://github.com/agentskills/agentskills)

Skillfully reads next:

- [What Is an Agent Skill?](/blog/what-is-an-agent-skill)
- [Agent Skills vs Prompts](/blog/agent-skills-vs-prompts)
- [How to write better agent skills](/blog/how-to-write-better-agent-skills)
- [Start with agent skills](/guide/start-with-agent-skills)
- [Design the skill contract](/guide/design-the-skill-contract)
- [Install feedback collection](/guide/install-feedback-collection)
