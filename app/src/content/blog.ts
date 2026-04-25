export type ArticleBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "callout";
      title: string;
      body: string[];
    }
  | {
      type: "list";
      items: string[];
    };

export type ArticleSection = {
  id: string;
  title: string;
  blocks: ArticleBlock[];
};

export type BlogArticle = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  publishedAt: string;
  readTime: string;
  author: string;
  sections: ArticleSection[];
  nextSlug?: string;
};

export const blogArticles: BlogArticle[] = [
  {
    slug: "how-to-write-better-agent-skills",
    title: "How to write better agent skills",
    subtitle:
      "A practical system for turning a good prompt into an agent skill that can be reused, measured, and improved.",
    category: "Skill authoring",
    publishedAt: "Apr 25, 2026",
    readTime: "7 min read",
    author: "Skillfully",
    nextSlug: "measuring-agent-skill-quality",
    sections: [
      {
        id: "instrument-the-outcome",
        title: "Instrument the outcome",
        blocks: [
          {
            type: "paragraph",
            text: "A useful skill has a clear job. It should tell the agent what done means, what evidence to collect, and where to report whether the run helped.",
          },
          {
            type: "callout",
            title: "The feedback question",
            body: [
              "Ask for the result, the blocker, and the confidence level while the execution context is still fresh.",
              "Skillfully turns that self-assessment into a dataset you can review instead of guessing from chat transcripts.",
            ],
          },
        ],
      },
      {
        id: "keep-instructions-operational",
        title: "Keep instructions operational",
        blocks: [
          {
            type: "paragraph",
            text: "Good skills read like working procedure, not brand copy. Prefer concrete checks, command paths, fallback behavior, and stop rules.",
          },
          {
            type: "list",
            items: [
              "Name the exact files, routes, or APIs the agent should inspect first.",
              "Describe the smallest acceptable proof before the agent reports completion.",
              "Call out what is intentionally out of scope so the agent does not expand the task.",
            ],
          },
        ],
      },
      {
        id: "tighten-after-real-runs",
        title: "Tighten after real runs",
        blocks: [
          {
            type: "paragraph",
            text: "A skill gets better when you compare what it promised against what happened. Review negative and neutral feedback first, then edit the skill around repeated failure modes.",
          },
          {
            type: "callout",
            title: "Revision loop",
            body: [
              "Group feedback by failure cause.",
              "Patch the instruction that would have prevented the failure.",
              "Run the skill again and check whether the next feedback batch changes.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "measuring-agent-skill-quality",
    title: "Measuring agent skill quality",
    subtitle:
      "How to read Skillfully feedback when you are deciding whether a skill is ready to share with other agents or teammates.",
    category: "Analytics",
    publishedAt: "Apr 25, 2026",
    readTime: "5 min read",
    author: "Skillfully",
    nextSlug: "how-to-write-better-agent-skills",
    sections: [
      {
        id: "start-with-ratio",
        title: "Start with the rating ratio",
        blocks: [
          {
            type: "paragraph",
            text: "Positive feedback tells you the skill worked at least once. Negative and neutral feedback are the better product signals because they show where the skill lost context, stalled, or needed a human to recover.",
          },
          {
            type: "list",
            items: [
              "Positive: the skill completed the intended job.",
              "Neutral: the skill partly worked, but the agent could not fully prove the result.",
              "Negative: the skill failed, blocked the run, or gave the agent the wrong next step.",
            ],
          },
        ],
      },
      {
        id: "read-the-words",
        title: "Read the words, not only the score",
        blocks: [
          {
            type: "paragraph",
            text: "The rating is the sorting layer. The written feedback is where you find the actual repair. Look for repeated nouns, missing prerequisites, unclear commands, and vague completion standards.",
          },
          {
            type: "callout",
            title: "Useful review habit",
            body: [
              "Keep a short changelog next to the skill.",
              "Each time you edit the skill, note which feedback cluster the change is meant to fix.",
            ],
          },
        ],
      },
      {
        id: "share-only-after-patterns",
        title: "Share only after patterns stabilize",
        blocks: [
          {
            type: "paragraph",
            text: "Do not promote a skill because the first run was impressive. Promote it when repeated runs produce similar positive evidence and the remaining negative feedback is explainable.",
          },
        ],
      },
    ],
  },
];

export function getBlogArticle(slug: string) {
  return blogArticles.find((article) => article.slug === slug);
}

export function getNextArticle(article: BlogArticle) {
  const nextSlug = article.nextSlug;

  if (!nextSlug) {
    return undefined;
  }

  return getBlogArticle(nextSlug);
}
