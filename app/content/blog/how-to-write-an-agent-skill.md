---
title: "How to Write an Agent Skill That Actually Works"
subtitle: A practical workflow for experts and technical enablement teams who want skills that agents can discover, run, and improve over time.
category: Skill authoring
publishedAt: 2026-05-26
readTime: 10 min read
author: tau-valerius
nextSlug: how-to-test-an-agent-skill
---

## How do you write an agent skill that actually works?

Write the skill like a repeatable job, not like a clever paragraph.

A working agent skill does five things well:

1. names one repeatable job
2. tells the agent which inputs and sources to trust
3. defines visible completion evidence
4. sets stop rules and boundaries
5. creates a feedback path so the skill can improve after release

That is the core difference between **writing a prompt** and **writing an agent skill**. OpenAI’s Codex documentation describes a skill as a package of instructions, resources, and optional scripts that helps an agent follow a workflow reliably, while OpenAI’s prompt engineering guide describes prompting as the process of writing effective instructions for one model interaction. Microsoft’s Agent Skills documentation uses the same workflow framing: portable packages of instructions, scripts, and resources that give agents specialized capabilities. [OpenAI Codex skills](https://developers.openai.com/codex/skills) · [OpenAI prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering) · [Microsoft Agent Skills](https://learn.microsoft.com/en-us/agent-framework/agents/skills)

If you only remember one line from this article, make it this: **a prompt asks for an answer, but a skill defines a reusable operating procedure**.

This guide is for two audiences at once:

- **experts making skills** from real workflows, frameworks, and playbooks
- **developer relations and technical enablement people** who need reusable assets other people can install and run with less coaching

If you are still deciding whether you need a skill at all, read [What Is an Agent Skill?](/blog/what-is-an-agent-skill) and [Agent Skills vs Prompts](/blog/agent-skills-vs-prompts) first. This article assumes you already know the job is repeatable enough to deserve a real skill.

## Start with a repeatable job, not a clever paragraph

Most weak skills start too broad.

They sound like this:

> Help with product strategy.

Or this:

> Review code and give feedback.

Or this:

> Turn my expertise into better answers.

Those are not skills yet. They are ambitions.

A skill gets better the moment you can describe the job in a way that someone else could recognize, trigger, and inspect.

Better starting points look like this:

- turn a customer interview transcript into a structured pain-point memo
- review a pull request for security regressions before merge
- convert a positioning worksheet into homepage message options
- inspect a repo, find broken analytics instrumentation, and return the exact files that need changes

Skillfully’s public guide starts in the right place: the first guide article says to define the repeatable job before worrying about snippets, metrics, or sharing, and to name the job, the inputs, and the visible result. [Start with agent skills](/guide/start-with-agent-skills)

That advice is useful because a repeatable job gives you three things immediately:

- a cleaner trigger for when the skill should run
- a simpler definition of what success looks like
- a better chance of getting actionable feedback after real use

A good test is this: **could two different people ask for this job in slightly different words and still mean the same thing?** If yes, you probably have the beginning of a skill. If not, keep narrowing.

## Define the skill contract before you write the long body

Once the job is clear, define the contract.

The contract is the part that makes the skill operational instead of aspirational. Skillfully’s second public guide article is basically a contract-writing guide: specify trusted inputs, the first files or tools to inspect, completion evidence, stop rules, and the feedback prompt. [Design the skill contract](/guide/design-the-skill-contract)

Here is the simplest way to think about it:

| Component | Weak version | Working version | Why it matters |
| --- | --- | --- | --- |
| Job | “Help with onboarding” | “Turn a new-user support thread into a step-by-step onboarding fix list” | Agents need a bounded unit of work |
| Inputs | “Use the context provided” | “Requires the support thread, product area, and current onboarding copy” | Prevents hallucinated assumptions |
| Truth path | “Investigate the issue” | “Read the thread first, then inspect `/app/onboarding`, then check analytics events” | Reduces wasted exploration |
| Completion evidence | “Return your findings” | “Return the broken step, affected file paths, proposed change, and how to verify it” | Makes success inspectable |
| Stop rules | “Ask if needed” | “Stop if the relevant repo or account context is missing, or if the fix needs policy approval” | Prevents scope creep |
| Feedback | “Let us know how it went” | “After the task attempt, report success, blocker, and what instruction should change next” | Creates an iteration loop |

This is also where many skill authors discover they are actually writing two skills, not one.

If your draft requires the agent to:

- analyze a transcript
- write a strategy memo
- turn the memo into a landing page
- publish the changes in GitHub

that is usually not one skill. That is a small workflow system. Split it.

A good skill contract is opinionated enough to reduce ambiguity, but not so rigid that it becomes a brittle macro.

## A 7-step workflow for writing an agent skill

If you want a practical system, use this workflow.

### 1. Name the job in one sentence

Use the format:

**For [audience], do [repeatable job] using [core inputs], and return [proof of completion].**

Example:

> For a sales team, turn a call transcript into objections, buying signals, next actions, and a follow-up email draft, using the transcript and account notes, and return the structured brief plus the draft.

If you cannot write this sentence, the skill is still too fuzzy.

### 2. List the required inputs

Separate required inputs from useful context.

Required inputs might include:

- file paths
- URLs
- transcript text
- account or repo identifiers
- tool access
- product area or audience

This is one of the highest-leverage improvements you can make. A surprising amount of “agent unreliability” is really just **missing input discipline**.

### 3. Tell the agent where to look first

Good skills do not say only *what* to do. They also improve the truth path.

If there is a fastest path to reality, name it.

Examples:

- read the failing test before reading the implementation
- inspect the customer complaint before opening the analytics dashboard
- review the current page copy before drafting replacements
- read `README`, then `docs/`, then changed files

This mirrors how strong human operators work. They know where to look first.

### 4. Write visible completion evidence

Avoid endings like:

- “summarize what you found”
- “share recommendations”
- “provide the result”

Instead require proof that can be checked:

- files changed
- commands run
- routes verified
- screenshots captured
- links opened
- specific structured sections returned

This is one reason Skillfully’s guide pushes authors to prefer visible evidence over vague success language. Feedback becomes much more useful when the result can be inspected. [Start with agent skills](/guide/start-with-agent-skills)

### 5. Add stop rules

A skill that never stops is not robust. It is just polite.

Stop rules should tell the agent when to:

- halt because a required input is missing
- report partial progress
- escalate because the next step needs a human decision
- avoid changing something that is intentionally out of scope

This is especially important for DevRel and enablement workflows where agents may be operating across repos, docs, demos, and launch assets.

### 6. Write the description for discovery

In OpenAI Codex, the initial skills list includes each skill’s name, description, and file path before the full skill is loaded. The docs recommend short descriptions with clear scope and boundaries because implicit activation depends on that description, and very large skill sets may force descriptions to be shortened. [OpenAI Codex skills](https://developers.openai.com/codex/skills)

That means your description should not read like brand copy. It should read like a trigger.

Weak description:

> Helps teams move faster with better decisions.

Better description:

> Review a pull request for analytics regressions. Use when event tracking may have changed and you need changed files, missing events, and verification steps. Do not use for general code review.

That description is better because it answers three things fast:

- what this skill does
- when to use it
- when not to use it

### 7. Add feedback and release it small

The first version should be narrow enough to survive contact with real use.

Skillfully’s guide recommends putting feedback **after** the task attempt, not in the middle of the workflow. That is the right instinct. You want feedback while the execution context is still fresh, but you do not want the skill to interrupt its own job just to narrate. [Install feedback collection](/guide/install-feedback-collection)

A small version released to real usage teaches more than a big imagined version that never gets run.

## Worked example: turning expertise into a runnable skill

Here is what the workflow looks like when you turn a real expert process into a skill.

**Raw expertise:** “I can listen to a sales call and tell you what the buyer actually cares about.”

**Weak skill draft:**

> Analyze this sales call and give insights.

**Working skill draft:**

- **Job:** Turn a sales-call transcript into a structured account brief.
- **Required inputs:** transcript, account notes, deal stage.
- **Inspect first:** read the transcript once, then check the account notes for prior objections.
- **Return:** top objections, buying signals, next actions, and a follow-up email draft.
- **Stop rules:** stop if the transcript is missing, if speaker attribution is too broken to trust, or if account context is unavailable.
- **Feedback prompt:** after the attempt, report whether the output was usable, what blocked the run, and which instruction should change next.

That version works better because the expert’s judgment is now attached to a repeatable shape. It can be discovered, run, reviewed, and improved.

This is also a good example of why not every framework should become one giant skill. If the same expert also wants a separate workflow for call prep, objection handling, and follow-up sequencing, those are usually separate skills with different triggers and completion evidence.

## Keep the main file short and move depth into references or scripts

Both OpenAI Codex and Microsoft Agent Skills describe a progressive disclosure model: the system advertises a lightweight skill definition first, then loads deeper instructions, resources, and scripts only when needed. [OpenAI Codex skills](https://developers.openai.com/codex/skills) · [Microsoft Agent Skills](https://learn.microsoft.com/en-us/agent-framework/agents/skills)

That has a practical implication for authors:

**do not dump every possible nuance into the main skill file**.

Use the main skill instructions for:

- the job definition
- the contract
- the workflow steps
- the stop rules
- the feedback instruction

Move supporting depth into:

- `references/` for policy docs, examples, and background material
- `scripts/` for executable helpers
- `assets/` for templates or static files

This keeps the main skill easier to scan, easier to maintain, and easier for the agent to load without wasting context.

## Add feedback and iteration from day one

A skill is not done when it gets one impressive run.

It is healthier to treat a skill like a small product:

- version it
- observe it
- read negative feedback first
- patch repeated failure modes
- rerun it

That is the mental model behind Skillfully’s public guide and landing-page messaging: publish the skill, collect real feedback, and improve the next version from evidence instead of guesswork. [Install feedback collection](/guide/install-feedback-collection)

The point is not that every skill needs a huge analytics stack on day one. The point is that **every reusable skill needs a way to learn**.

Without that, you are not really publishing a reusable workflow. You are freezing a draft.

## Common mistakes that make skills fail in real use

### Mistake 1: the skill is just a long prompt

Longer is not the same as better.

If the skill has no clear inputs, no proof of completion, and no stop rules, it is still prompt-shaped.

### Mistake 2: the job is too broad

“Help with growth,” “help with hiring,” and “help with research” are categories, not skills.

### Mistake 3: the description is too generic

If the description sounds like a slogan, discovery gets worse.

### Mistake 4: there is no truth path

If the skill does not tell the agent where to inspect first, the agent has to improvise search strategy every time.

### Mistake 5: feedback is treated like an afterthought

If you only learn from occasional praise or complaints, improvement becomes anecdotal instead of systematic.

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

The best format is the one your target runtime can discover and execute reliably, but the common pattern is consistent: a required main instruction file plus optional references, scripts, and assets. Both OpenAI Codex and Microsoft Agent Skills document this package shape. [OpenAI Codex skills](https://developers.openai.com/codex/skills) · [Microsoft Agent Skills](https://learn.microsoft.com/en-us/agent-framework/agents/skills)

### How is a skill different from a prompt template?

A prompt template helps with one class of outputs. A skill is closer to a reusable operating procedure with boundaries, completion evidence, and a lifecycle.

### How long should a skill be?

Long enough to define the job clearly, but short enough to stay operational. Put the main procedure in the core skill file and move heavy reference material into supporting files.

### Should every expert turn their framework into a skill?

No. The best candidates are workflows that repeat, can be inspected, and create value after multiple runs. One-off inspiration does not need a skill.

## References and next reads

External references:

- [OpenAI Codex skills documentation](https://developers.openai.com/codex/skills)
- [OpenAI prompt engineering guide](https://developers.openai.com/api/docs/guides/prompt-engineering)
- [Microsoft Agent Skills documentation](https://learn.microsoft.com/en-us/agent-framework/agents/skills)

Skillfully reads next:

- [What Is an Agent Skill?](/blog/what-is-an-agent-skill)
- [Agent Skills vs Prompts](/blog/agent-skills-vs-prompts)
- [Start with agent skills](/guide/start-with-agent-skills)
- [Design the skill contract](/guide/design-the-skill-contract)
- [Install feedback collection](/guide/install-feedback-collection)
