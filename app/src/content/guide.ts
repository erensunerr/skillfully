import {
  skillfullyEditorialAuthor,
  type ArticleAuthor,
} from "@/content/authors";

export type GuideSection = {
  id: string;
  title: string;
  body: string;
  bullets: string[];
};

export type GuideArticle = {
  slug: string;
  number: string;
  title: string;
  subtitle: string;
  author: ArticleAuthor;
  sections: GuideSection[];
};

export const guideArticles: GuideArticle[] = [
  {
    slug: "start-with-agent-skills",
    number: "01",
    title: "Start with agent skills",
    subtitle:
      "Define the repeatable job before you worry about snippets, metrics, or sharing.",
    author: skillfullyEditorialAuthor,
    sections: [
      {
        id: "what-a-skill-is-for",
        title: "What a skill is for",
        body: "An agent skill is a reusable operating procedure. It should help the agent complete a specific job with less ambiguity each time it runs.",
        bullets: [
          "Treat the skill as procedure, not inspiration.",
          "Name the job, the inputs, and the visible result.",
          "Leave room for the agent to adapt within clear limits.",
        ],
      },
      {
        id: "choose-the-first-workflow",
        title: "Choose the first workflow",
        body: "Start with a workflow that happens often enough to teach you something and concrete enough that success can be inspected.",
        bullets: [
          "Pick a workflow with a repeatable input.",
          "Avoid broad strategy tasks for the first version.",
          "Use a workflow where a failed run has an obvious cause.",
        ],
      },
      {
        id: "write-the-observable-outcome",
        title: "Write the observable outcome",
        body: "The skill needs an outcome the agent can prove. That proof is what makes feedback meaningful instead of subjective.",
        bullets: [
          "Prefer files changed, commands run, links opened, or responses submitted.",
          "State what evidence belongs in the final answer.",
          "Avoid vague outcomes like improve, review, or polish without a check.",
        ],
      },
      {
        id: "decide-when-feedback-posts",
        title: "Decide when feedback posts",
        body: "Feedback belongs after the job has been attempted. The agent should not interrupt the core workflow just to report progress.",
        bullets: [
          "Place the feedback instruction near completion criteria.",
          "Ask for feedback when the skill succeeds, partially succeeds, or fails.",
          "Keep the feedback short enough that the agent will actually send it.",
        ],
      },
      {
        id: "ship-the-smallest-useful-version",
        title: "Ship the smallest useful version",
        body: "A small useful skill beats a complete imagined one. Publish the minimum version that can collect real run evidence.",
        bullets: [
          "Keep the first version narrow.",
          "Run it against a real task quickly.",
          "Let feedback decide the next edit.",
        ],
      },
    ],
  },
  {
    slug: "design-the-skill-contract",
    number: "02",
    title: "Design the skill contract",
    subtitle:
      "Turn the skill from a loose instruction into a contract the agent can execute consistently.",
    author: skillfullyEditorialAuthor,
    sections: [
      {
        id: "inputs-the-agent-can-trust",
        title: "Inputs the agent can trust",
        body: "A skill should say which inputs are required and which can be inferred from context. This prevents the agent from filling gaps with guesses.",
        bullets: [
          "List required paths, URLs, IDs, or account context.",
          "State what to do if an input is missing.",
          "Keep optional context separate from required context.",
        ],
      },
      {
        id: "tools-and-files-to-inspect",
        title: "Tools and files to inspect",
        body: "The best skills point the agent at the fastest truth path before it starts improvising.",
        bullets: [
          "Name the first files or routes to read.",
          "Prefer repo-local helpers over generic shell exploration.",
          "Tell the agent when external lookup is useful.",
        ],
      },
      {
        id: "completion-evidence",
        title: "Completion evidence",
        body: "Completion evidence is the difference between claiming the job is done and proving the job is done.",
        bullets: [
          "Require the command, screenshot, route check, or diff that proves the result.",
          "Make the final answer name the evidence.",
          "Avoid proof that depends only on the agent's confidence.",
        ],
      },
      {
        id: "stop-rules",
        title: "Stop rules",
        body: "Stop rules keep the skill from expanding into unrelated work when it hits uncertainty.",
        bullets: [
          "Name blockers that require a human decision.",
          "State what not to change.",
          "Tell the agent when to report partial progress.",
        ],
      },
      {
        id: "feedback-prompt",
        title: "Feedback prompt",
        body: "The feedback prompt should ask what happened, what rating fits the run, and what instruction would have helped.",
        bullets: [
          "Ask for one rating.",
          "Ask for a short reason.",
          "Ask what to change in the skill next.",
        ],
      },
    ],
  },
  {
    slug: "install-feedback-collection",
    number: "03",
    title: "Install feedback collection",
    subtitle:
      "Wire Skillfully into the skill without making feedback the main task.",
    author: skillfullyEditorialAuthor,
    sections: [
      {
        id: "create-the-tracked-skill",
        title: "Create the tracked skill",
        body: "Create one tracked Skillfully entry for the reusable skill you want to measure.",
        bullets: [
          "Use a name that matches the skill file or workflow.",
          "Keep separate skills separate in Skillfully.",
          "Copy the generated snippet only after the skill entry exists.",
        ],
      },
      {
        id: "paste-the-snippet",
        title: "Paste the snippet",
        body: "The snippet should live where the agent sees completion behavior, not at the top where it distracts from the job.",
        bullets: [
          "Place it near final reporting instructions.",
          "Preserve the generated skill ID.",
          "Do not rewrite the endpoint by hand.",
        ],
      },
      {
        id: "keep-feedback-after-the-job",
        title: "Keep feedback after the job",
        body: "Feedback is a final step. The agent should first attempt the work, then send its assessment.",
        bullets: [
          "Avoid feedback prompts in the setup section.",
          "Ask for feedback even when blocked.",
          "Keep the final answer useful to the human first.",
        ],
      },
      {
        id: "run-a-live-task",
        title: "Run a live task",
        body: "A live task will reveal whether the skill instruction is clear enough for the agent to use without extra coaching.",
        bullets: [
          "Use a real repo or workflow.",
          "Do not over-explain outside the skill.",
          "Watch for missing prerequisites.",
        ],
      },
      {
        id: "confirm-the-first-response",
        title: "Confirm the first response",
        body: "After the run, confirm the feedback arrived and that its text is specific enough to drive an edit.",
        bullets: [
          "Check rating, reason, and timestamp.",
          "Verify the feedback maps to the right skill.",
          "If nothing arrives, inspect the skill instruction before changing the app.",
        ],
      },
    ],
  },
  {
    slug: "read-skill-feedback",
    number: "04",
    title: "Read skill feedback",
    subtitle:
      "Use ratings and run notes to find the instructions that need to change first.",
    author: skillfullyEditorialAuthor,
    sections: [
      {
        id: "start-with-rating-mix",
        title: "Start with rating mix",
        body: "The rating mix tells you where to look. Positive runs prove the path can work. Neutral and negative runs show where the path breaks.",
        bullets: [
          "Review negative and neutral runs first.",
          "Keep positive runs as examples of the intended path.",
          "Avoid overreacting to a single unusual failure.",
        ],
      },
      {
        id: "read-negative-feedback-first",
        title: "Read negative feedback first",
        body: "Negative feedback usually contains the sharpest product signal because it names the point where the agent could not continue.",
        bullets: [
          "Look for missing setup.",
          "Look for unclear ownership boundaries.",
          "Look for proof the agent could not collect.",
        ],
      },
      {
        id: "find-repeated-blockers",
        title: "Find repeated blockers",
        body: "Repeated blockers matter more than isolated complaints. Group similar failures before editing.",
        bullets: [
          "Cluster by missing input, unclear step, missing tool, or bad stop rule.",
          "Count repeated language across runs.",
          "Choose the smallest edit that addresses the cluster.",
        ],
      },
      {
        id: "separate-skill-bugs-from-task-bugs",
        title: "Separate skill bugs from task bugs",
        body: "Sometimes the task was impossible. Sometimes the skill failed. Keep those categories separate.",
        bullets: [
          "A task bug needs a better user prompt or environment.",
          "A skill bug needs clearer reusable instruction.",
          "A product bug needs a change in Skillfully itself.",
        ],
      },
      {
        id: "decide-the-next-edit",
        title: "Decide the next edit",
        body: "The next edit should map directly to a feedback pattern. If you cannot name the pattern, keep reading before editing.",
        bullets: [
          "Write the failure pattern in one sentence.",
          "Patch one instruction.",
          "Run the skill again before making a second edit.",
        ],
      },
    ],
  },
  {
    slug: "improve-and-publish-skills",
    number: "05",
    title: "Improve and publish skills",
    subtitle:
      "Turn repeated feedback into a stable skill that other agents and teammates can trust.",
    author: skillfullyEditorialAuthor,
    sections: [
      {
        id: "edit-one-failure-mode",
        title: "Edit one failure mode",
        body: "Small edits are easier to evaluate. Change one repeated failure mode, then measure the next batch.",
        bullets: [
          "Avoid rewriting the whole skill after one run.",
          "Keep the old failure in mind while editing.",
          "Prefer precise replacement text over extra explanation.",
        ],
      },
      {
        id: "test-the-revised-skill",
        title: "Test the revised skill",
        body: "Run the revised skill against a comparable task so the before and after feedback is meaningful.",
        bullets: [
          "Use a similar workflow.",
          "Keep the human prompt short.",
          "Check whether the original failure repeats.",
        ],
      },
      {
        id: "track-before-and-after",
        title: "Track before and after",
        body: "The point of feedback is not a perfect score. It is knowing whether a specific change made the skill easier to use.",
        bullets: [
          "Compare rating mix before and after.",
          "Read the reason text for the same blocker.",
          "Do not promote the skill until the pattern improves.",
        ],
      },
      {
        id: "share-the-stable-version",
        title: "Share the stable version",
        body: "Share the skill when repeated runs produce similar positive evidence and the remaining failures are understood.",
        bullets: [
          "Include setup requirements.",
          "Include known limits.",
          "Keep feedback collection installed after sharing.",
        ],
      },
      {
        id: "keep-a-release-note",
        title: "Keep a release note",
        body: "A short release note connects feedback to the exact instruction change. That makes future edits easier.",
        bullets: [
          "Name the feedback pattern.",
          "Name the instruction changed.",
          "Record the result of the next run.",
        ],
      },
    ],
  },
];

export function getGuideArticle(slug: string) {
  return guideArticles.find((article) => article.slug === slug);
}

export function getFirstGuideArticle() {
  return guideArticles[0];
}

export function getNextGuideArticle(article: GuideArticle) {
  const currentIndex = guideArticles.findIndex((candidate) => candidate.slug === article.slug);

  if (currentIndex === -1) {
    return undefined;
  }

  return guideArticles[currentIndex + 1];
}
