---
title: "How to Collect Feedback on Agent Skills"
subtitle: A practical post-run feedback workflow for experts and technical enablement teams who want reusable skills to improve from real usage instead of anecdotes.
category: Skill feedback
publishedAt: 2026-06-06
readTime: 11 min read
author: tau-valerius
nextSlug: how-to-publish-an-agent-skill-to-github
---

## How should you collect feedback on agent skills?

Collect feedback after each real run, in one small structured payload, tied to the exact skill version and outcome.

The simplest useful model is:

1. let the agent attempt the task first
2. ask for exactly one post-run feedback response
3. capture a small rating plus a short explanation of what happened
4. review negative and neutral runs before positive ones
5. group repeated failures before editing the skill

That approach works because it treats a skill like a reusable workflow, not like a clever paragraph. OpenAI’s agent evaluation guidance recommends starting with traces when you are still debugging behavior, then moving to repeatable eval runs when you know what good looks like. OpenAI’s skill eval guidance says the basic unit is a prompt, a captured run with traces and artifacts, a few checks, and a score you can compare over time. [Evaluate agent workflows](https://developers.openai.com/api/docs/guides/agent-evals.md) · [Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills)

This article is mainly for **experts and operators making skills** from real workflows. It is also for **developer relations and technical enablement teams** who need installable skills to improve after release instead of drifting.

If you are still writing the skill itself, start with [How to Write an Agent Skill That Actually Works](/blog/how-to-write-an-agent-skill). If you are preparing the skill for distribution, read [How to Publish an Agent Skill to GitHub](/blog/how-to-publish-an-agent-skill-to-github). If you want the product-side guide flow, Skillfully’s public guide already covers [Install feedback collection](/guide/install-feedback-collection) and [Read skill feedback](/guide/read-skill-feedback).

## Why most skill feedback is too weak to improve anything

A lot of teams say they are collecting feedback when they are really collecting one of these:

- occasional GitHub issues
- one-off Slack messages
- vague comments like “worked” or “felt off”
- benchmark results with no real-world run context

That is not enough if the skill is meant to improve over time.

A skill fails in specific ways:

- the agent did not trigger it when it should have
- it triggered in the wrong situation
- a required input was missing
- the truth path was unclear
- the completion proof was weak
- the stop rules were too soft, so the agent guessed

Those failure modes only become actionable when feedback is tied to a real run. Skillfully’s long-form internal framing gets this exactly right: many skill creators are still shipping blind, with anecdotal feedback, occasional issues, or vibes instead of operational visibility. That is why post-run feedback matters.

Skillfully’s public guide pushes the same direction in smaller pieces. The guide says feedback belongs after the job has been attempted, should still be requested when the agent is blocked, and should be specific enough to drive the next edit. [Install feedback collection guide source](https://github.com/erensunerr/skillfully/blob/main/app/src/content/guide.ts)

## What feedback to collect from every skill run

Do not ask for an essay. Ask for fields you can sort, compare, and act on.

| Field | What it captures | Why it matters |
| --- | --- | --- |
| Skill identifier or version | Which exact skill copy ran | Prevents mixed feedback across revisions |
| Rating | Positive, neutral, or negative | Gives you fast triage for where to look first |
| Short run summary | What happened in one or two sentences | Preserves context without requiring a full transcript |
| Failure or blocker reason | What stopped the run or made it partial | Helps you find the instruction gap |
| Completion evidence status | Whether the agent produced the required proof | Separates polished answers from verified results |

That is close to how Skillfully structures the managed runtime block in code. In [`agent-api.ts`](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/agent-api.ts), the feedback section requires **exactly one** JSON payload with a `positive`, `negative`, or `neutral` rating and a brief explanation of what happened. The same managed block also requires an update check against the latest manifest before use, which matters because stale local copies can create misleading feedback.

The core payload is intentionally small:

```json
{
  "rating": "positive" | "negative" | "neutral",
  "feedback": "<brief summary of what happened, what worked, and what did not>"
}
```

That is a good default because most teams need signal density, not form complexity.

## A 6-step workflow for collecting useful agent skill feedback

### 1. Put feedback after the task, not before it

This is the highest-leverage fix for most skills.

If the feedback instruction appears near the top of the skill, it competes with the actual job. If it appears near completion criteria, it acts like a closing step.

Skillfully’s public guide is explicit: place the snippet where the agent sees completion behavior, not at the top where it distracts from the job. It also says to keep the final answer useful to the human first. [Install feedback collection guide source](https://github.com/erensunerr/skillfully/blob/main/app/src/content/guide.ts)

A simple rule: **attempt the work first, then report how it went**.

### 2. Ask for exactly one post-run response

Multiple feedback prompts per run create noise fast.

You usually do not need:

- a setup-time check-in
- a mid-task rating
- a final rating
- a second “anything else?” prompt

One response is enough if it lands after the job attempt. Skillfully’s managed block enforces this directly by requiring exactly one feedback payload before the agent returns its response. [`agent-api.ts`](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/agent-api.ts)

This matters for experts especially. If you are turning a real workflow into a skill, interruption-heavy prompts distort the workflow and make the skill feel worse than it is.

### 3. Use a small rating system with strict meanings

Three states are usually enough:

- **positive**: the requested deliverable was produced and no mandatory step was missing
- **negative**: a required step or deliverable failed, or the run was blocked
- **neutral**: the work was partially achieved or the outcome was genuinely uncertain

That is again the exact pattern in Skillfully’s managed feedback template. It is strong because it prevents teams from overloading one score with too many meanings. [`agent-api.ts`](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/agent-api.ts)

If your rating scale is fuzzy, your trendline will be fuzzy too.

### 4. Test the feedback flow on live runs, including blocked runs

Do not validate feedback collection only on a happy path.

Skillfully’s guide recommends running a live task, using a real repo or workflow, avoiding extra coaching outside the skill, and then confirming the first response actually arrives. [Install feedback collection guide source](https://github.com/erensunerr/skillfully/blob/main/app/src/content/guide.ts)

That means you should test at least three cases:

1. **happy path**: the skill completes the intended job
2. **blocked path**: a required input, permission, or file is missing
3. **ambiguous path**: the task partly matches the skill but may not fully belong to it

OpenAI’s evaluation guidance supports this workflow well. Start with traces while behavior is still unclear. Once you know what good and bad runs look like, move to repeatable checks and eval runs. [Evaluate agent workflows](https://developers.openai.com/api/docs/guides/agent-evals.md)

### 5. Review negative and neutral runs first

Positive feedback proves the path can work. Negative and neutral feedback tell you where it breaks.

Skillfully’s guide says to start with rating mix, review negative and neutral runs first, and keep positive runs as examples of the intended path. It also says repeated blockers matter more than isolated complaints. [Read skill feedback guide source](https://github.com/erensunerr/skillfully/blob/main/app/src/content/guide.ts)

That gives you a clean triage order:

1. negative runs
2. neutral runs
3. positive runs for comparison

Then cluster failures into a few reusable buckets:

- missing input
- unclear step
- wrong truth path
- missing tool or permission
- weak stop rule
- vague completion evidence

This is the moment where feedback stops being commentary and starts becoming product signal.

### 6. Turn repeated patterns into one edit at a time

Do not rewrite the whole skill after one bad run.

Skillfully’s guide recommends choosing the smallest edit that addresses the repeated pattern, then running the revised skill against a comparable task so the before-and-after signal stays meaningful. [Read skill feedback](/guide/read-skill-feedback) · [Improve and publish skills](/guide/improve-and-publish-skills)

A useful loop looks like this:

1. name the repeated failure in one sentence
2. patch one instruction, boundary, or proof requirement
3. run the skill again on a similar task
4. compare rating mix and reason text
5. keep the change only if the pattern improves

That is a better editing loop than “add more explanation everywhere.”

## First-party Skillfully examples worth copying

Skillfully’s public product and code already show a practical feedback model.

### Example 1: feedback belongs near completion

The guide article for installing feedback collection says the snippet should live near final reporting instructions, not at the top of the skill. That is good operational advice because the agent should stay focused on the job until it has attempted the work. [Guide source](https://github.com/erensunerr/skillfully/blob/main/app/src/content/guide.ts)

### Example 2: feedback should still fire when blocked

The same guide says to ask for feedback even when blocked. That is important because blocked runs usually contain the sharpest signal about missing prerequisites and bad stop rules. [Guide source](https://github.com/erensunerr/skillfully/blob/main/app/src/content/guide.ts)

### Example 3: version checks should happen before use

In [`install-prompts.ts`](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/skills/install-prompts.ts), Skillfully’s generated install prompt tells the agent to check the manifest for the latest version before each use and then load the latest `SKILL.md` as operating instructions. That matters because otherwise your feedback may describe an outdated copy of the skill.

### Example 4: feedback should be small enough to send consistently

The managed template in [`agent-api.ts`](https://github.com/erensunerr/skillfully/blob/main/app/src/lib/agent-api.ts) asks for one rating and one short summary. That is easier to collect consistently than a long survey.

## Feedback prompt examples you can adapt

Use prompts that ask for structured post-run signal, not generic opinion.

### Minimal post-run feedback block

```md
After attempting this skill and before returning your response, submit exactly one feedback payload.

Rate the run as `positive`, `neutral`, or `negative`.

Use:
- `positive` only if the requested deliverable was produced and no mandatory step was missing
- `negative` if a required step failed or the run was blocked
- `neutral` only if the work was partial or genuinely uncertain

Then send a brief summary of what happened, what worked, and what did not.
```

### Better prompt for skills with strict completion evidence

```md
After the task attempt, report:
1. rating: positive, neutral, or negative
2. whether the required completion evidence was produced
3. the main blocker or failure point, if any
4. the one instruction that would have helped most
```

### Better prompt for expert-authored skills

This works well when a subject-matter expert is turning judgment into a repeatable workflow:

```md
After attempting the workflow, explain briefly where the instructions were too vague, too broad, or missing a prerequisite. Prefer the smallest specific fix over general criticism.
```

These examples are better than “Let us know how it went” because they create revision data.

## Common mistakes when collecting skill feedback

| Mistake | What goes wrong | Better move |
| --- | --- | --- |
| Asking for feedback before the task | The agent focuses on reporting instead of doing the job | Put feedback near completion criteria |
| Asking for open-ended opinions only | You get vague comments that do not map to edits | Require a rating plus short reason |
| Ignoring blocked runs | You miss the sharpest setup and boundary failures | Collect feedback even on failure |
| Mixing all versions together | You cannot tell whether an edit helped | Tie feedback to a specific skill version or manifest |
| Editing after every individual complaint | The skill thrashes and gets harder to evaluate | Wait for repeated patterns |

## Checklist: is your skill feedback loop good enough?

- [ ] Feedback happens after the task attempt, not before it.
- [ ] The skill asks for exactly one post-run response.
- [ ] Ratings have strict meanings.
- [ ] The feedback includes a short explanation, not just a score.
- [ ] Blocked runs still produce feedback.
- [ ] Feedback is tied to a specific skill version or manifest.
- [ ] Negative and neutral runs are reviewed first.
- [ ] Repeated blockers are grouped before editing.
- [ ] Each revision changes one failure mode at a time.
- [ ] The next run is compared against the previous pattern.

## FAQ

### Should I collect feedback inside the skill or outside it?

Inside the skill is usually better for per-run consistency, as long as the feedback instruction is placed after the job attempt. Outside systems like GitHub issues or Slack threads can still help, but they are usually too manual to capture every run.

### How much feedback should I ask for?

Less than most teams think. A small rating plus a short explanation is enough to start. If you cannot act on that, the problem is often the skill design, not the lack of more survey fields.

### What should I do with positive feedback?

Keep it as proof of the intended path. Positive runs help you compare what good looks like against neutral and negative runs.

### Is feedback the same thing as an eval?

No. Feedback is usually the per-run human or agent signal about what happened. An eval is the more structured comparison layer: prompt, captured run, checks, and score. The best workflow uses both. [Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills)

## Suggested next reads

- [How to Write an Agent Skill That Actually Works](/blog/how-to-write-an-agent-skill)
- [How to Test an Agent Skill Before You Publish It](/blog/how-to-test-an-agent-skill)
- [How to Publish an Agent Skill to GitHub](/blog/how-to-publish-an-agent-skill-to-github)
- [Install feedback collection](/guide/install-feedback-collection)
- [Read skill feedback](/guide/read-skill-feedback)
- [Improve and publish skills](/guide/improve-and-publish-skills)
