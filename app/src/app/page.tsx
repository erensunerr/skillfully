import type { ReactNode } from "react";
import Link from "next/link";

import { SchematicGraphic } from "./hero-schematic";

const marqueeCopy =
  "NOW ONBOARDING DESIGN PARTNERS BUILDING AGENT SKILLS FOR CLAUDE, CURSOR, GOOSE, AND LOCAL AGENTS.";

const usageRows = [
  ["research-summarizer", "612", "82%"],
  ["code-review-checklist", "438", "76%"],
  ["market-analysis", "324", "71%"],
  ["onboarding-flow", "251", "86%"],
  ["sql-query-helper", "217", "73%"],
] satisfies Array<[string, string, string]>;

const featureCards = [
  {
    number: "01",
    title: "See which skills are actually being used",
    body: "Track real usage across your published skills. See which skills get invoked, which ones sit untouched, and which ones create the most useful outcomes.",
    visual: <UsageVisual />,
  },
  {
    number: "02",
    title: "Understand why agents fail",
    body: "When an agent struggles with a skill, Skillfully turns that run into structured feedback. See what was confusing, incomplete, or hard to execute.",
    visual: <FeedbackVisual />,
  },
  {
    number: "03",
    title: "Turn real feedback into better skills",
    body: "Use feedback from real users and agents to improve instructions, examples, edge cases, and workflows. Iterate based on evidence, not guesswork.",
    visual: <DiffVisual />,
  },
  {
    number: "04",
    title: "Publish skills with more confidence",
    body: "Skillfully adds a quality layer for agent skills, so publishing feels less like shipping a static file and more like maintaining a real product.",
    visual: <StatusVisual />,
  },
] satisfies Array<{
  number: string;
  title: string;
  body: string;
  visual: ReactNode;
}>;

const personaCards = [
  {
    label: "Developer skill author",
    items: [
      "Ship code helpers and workflows",
      "Track usage across versions",
      "Get feedback on edge cases",
      "Improve over time",
    ],
    tags: ["code-review-checklist", "sql-query-helper", "api-debugger", "unit-test-writer"],
  },
  {
    label: "Domain expert skill author",
    items: [
      "Turn expertise into reusable skills",
      "See how agents apply your knowledge",
      "Find gaps and unclear steps",
      "Improve with real feedback",
    ],
    tags: ["onboarding-flow", "market-analysis", "compliance-check", "report-generator"],
  },
] satisfies Array<{
  label: string;
  items: string[];
  tags: string[];
}>;

const loopSteps = [
  {
    number: "01",
    title: "Create or import a skill",
    body: "Start with a new skill or bring in one you already publish.",
  },
  {
    number: "02",
    title: "Publish it through Skillfully",
    body: "Give your skill a place to live, a version history, and a feedback channel.",
  },
  {
    number: "03",
    title: "Improve it from real usage",
    body: "See usage, read feedback, find failure patterns, and ship better versions.",
  },
] satisfies Array<{ number: string; title: string; body: string }>;

const faqs = [
  {
    question: "Is this just analytics for markdown files?",
    answer:
      "No. Skillfully is QA and analytics for agent skills. The goal is knowing whether agents can understand and execute your skill in real use.",
  },
  {
    question: "Do I need to be technical?",
    answer:
      "No. Skillfully is for anyone turning expertise into reusable agent instructions.",
  },
  {
    question: "Why not just use GitHub issues or user interviews?",
    answer:
      "Skillfully gives you a continuous feedback layer between those conversations, so you can see patterns across real skill usage.",
  },
] satisfies Array<{ question: string; answer: string }>;

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2 font-editorial-sans text-base font-bold uppercase">
      <span
        aria-hidden
        className={`relative h-5 w-5 shrink-0 rounded-full border-[5px] ${
          light ? "border-[var(--paper)]" : "border-[var(--ink)]"
        }`}
      >
        <span
          className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            light ? "bg-[var(--paper)]" : "bg-[var(--ink)]"
          }`}
        />
      </span>
      <span>Skillfully</span>
    </div>
  );
}

function RegistrationMark({
  className = "",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`registration-mark${light ? " light" : ""}${className ? ` ${className}` : ""}`}
    />
  );
}

function MarqueeBand() {
  return (
    <section className="grid gap-4 border-b border-[var(--ink)] bg-[var(--white)] px-5 py-3 font-editorial-mono text-[0.68rem] uppercase sm:grid-cols-[auto_1fr] sm:items-center">
      <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[var(--ink)]" />
      <div className="overflow-hidden whitespace-nowrap">
        <div className="editorial-marquee-track inline-flex min-w-max gap-10">
          <span>{marqueeCopy}</span>
          <span>{marqueeCopy}</span>
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  const metrics = [
    ["Total skills", "24", "+3 this week"],
    ["Skill runs", "1,842", "+18.3%"],
    ["Success rate", "78%", "-2.1%"],
    ["Feedback", "312", "+27.6%"],
  ] satisfies Array<[string, string, string]>;

  return (
    <div className="mx-auto w-full max-w-[56rem] border border-[var(--ink)] bg-[var(--paper)] shadow-[8px_8px_0_rgba(8,8,8,0.12)]">
      <div className="flex items-center justify-between border-b border-[var(--ink)] px-4 py-3">
        <BrandMark />
        <Link
          href="/dashboard"
          className="editorial-button editorial-button-dark px-3 py-2 text-[0.62rem]"
        >
          New skill
        </Link>
      </div>

      <div className="grid min-h-[24rem] md:grid-cols-[8.5rem_1fr]">
        <nav className="hidden border-r border-[var(--ink)] bg-[var(--white)] p-3 font-editorial-mono text-[0.68rem] md:block">
          {["Overview", "Skills", "Feedback", "Runs", "Authors", "Settings"].map((item, index) => (
            <div
              key={item}
              className={`mb-2 border border-transparent px-2 py-2 ${
                index === 0 ? "border-[var(--ink)] bg-[var(--paper)]" : ""
              }`}
            >
              {item}
            </div>
          ))}
        </nav>

        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-editorial-sans text-2xl font-semibold">Overview</h3>
            <select
              aria-label="Preview date range"
              className="border border-[var(--ink)] bg-[var(--paper)] px-3 py-2 font-editorial-mono text-[0.7rem]"
              defaultValue="dec"
            >
              <option value="dec">Dec 1</option>
            </select>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value, delta]) => (
              <div key={label} className="min-h-28 border border-[var(--ink)] bg-[var(--white)] p-3">
                <div className="font-editorial-mono text-[0.62rem] uppercase text-[var(--ink)]/60">
                  {label}
                </div>
                <div className="mt-4 font-editorial-sans text-3xl font-semibold">{value}</div>
                <div
                  className={`mt-2 font-editorial-mono text-[0.66rem] ${
                    delta.startsWith("-") ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  {delta}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_15rem]">
            <UsageTable compact />
            <div className="border border-[var(--ink)] bg-[var(--white)] p-3">
              <div className="font-editorial-mono text-[0.68rem] font-bold uppercase">
                Recent feedback
              </div>
              {[
                ["market-analysis", "Agent missed key comparator", "2m"],
                ["code-review-checklist", "Outdated example", "1h"],
                ["research-summarizer", "Confusing output format", "3h"],
              ].map(([skill, note, time]) => (
                <div key={skill} className="mt-4 border-b border-[var(--ink)]/20 pb-3 last:border-b-0">
                  <div className="flex items-center justify-between gap-2 font-editorial-mono text-[0.64rem]">
                    <span>{skill}</span>
                    <span>{time}</span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-[var(--ink)]/70">{note}</p>
                </div>
              ))}
              <Link href="/dashboard" className="mt-4 block font-editorial-mono text-[0.68rem] uppercase">
                View all feedback +
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className="border border-[var(--ink)] bg-[var(--white)] p-4">
      <div className="font-editorial-mono text-[0.68rem] font-bold uppercase">Skill usage</div>
      <div className="mt-4 overflow-hidden">
        <table className="w-full border-collapse font-editorial-mono text-[0.64rem]">
          <thead>
            <tr className="text-left text-[var(--ink)]/55">
              <th className="py-2 font-normal">Skill</th>
              <th className="py-2 font-normal">Runs</th>
              <th className="py-2 font-normal">Success rate</th>
              {compact ? null : <th className="py-2 font-normal">Trend</th>}
            </tr>
          </thead>
          <tbody>
            {usageRows.map(([skill, runs, success], index) => (
              <tr key={skill} className="border-t border-[var(--ink)]/15">
                <td className="py-3">{skill}</td>
                <td className="py-3">{runs}</td>
                <td className="py-3">{success}</td>
                {compact ? null : (
                  <td className="py-3">
                    <Sparkline index={index} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Sparkline({ index }: { index: number }) {
  const paths = [
    "M1 14 9 11 17 13 25 7 33 10 41 5 49 8",
    "M1 8 9 10 17 6 25 7 33 12 41 9 49 11",
    "M1 12 9 13 17 11 25 10 33 8 41 9 49 6",
    "M1 15 9 12 17 14 25 11 33 7 41 8 49 4",
    "M1 9 9 11 17 8 25 13 33 10 41 12 49 9",
  ];

  return (
    <svg aria-hidden viewBox="0 0 50 18" className="h-5 w-16">
      <path d={paths[index]} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function UsageVisual() {
  return <UsageTable />;
}

function FeedbackVisual() {
  return (
    <div className="border border-[var(--ink)] bg-[var(--white)] p-5 font-editorial-mono text-[0.68rem]">
      <div className="font-bold uppercase">Feedback detail</div>
      <div className="mt-5 grid grid-cols-[5rem_1fr] gap-y-2">
        <span className="text-[var(--ink)]/55">Skill</span>
        <span>market-analysis</span>
        <span className="text-[var(--ink)]/55">Agent</span>
        <span>Claude 3.5</span>
        <span className="text-[var(--ink)]/55">Run ID</span>
        <span>b47e9e7</span>
        <span className="text-[var(--ink)]/55">Time</span>
        <span>Apr 7, 2026 8:41 AM</span>
      </div>
      <div className="mt-5 border-t border-[var(--ink)] pt-4">
        <div className="font-bold">What worked</div>
        <p className="mt-2">Good data source selection</p>
      </div>
      <div className="mt-4 border-t border-[var(--ink)]/30 pt-4">
        <div className="font-bold">What failed</div>
        <p className="mt-2">Missed competitor benchmark</p>
      </div>
      <div className="mt-4 border-t border-[var(--ink)]/30 pt-4">
        <div className="font-bold">Suggested fix</div>
        <p className="mt-2">Add example for missing data handling</p>
      </div>
    </div>
  );
}

function DiffVisual() {
  const lines = [
    ["Returns a list of key competitors.", "Returns a list of key competitors."],
    ["Use available sources to gather data.", "If data is missing, gather the gap."],
    ["Summarize findings in a table.", "Summarize findings in a table."],
  ] satisfies Array<[string, string]>;

  return (
    <div className="border border-[var(--ink)] bg-[var(--white)] p-4">
      <div className="font-editorial-mono text-[0.68rem] font-bold uppercase">
        Skill: market-analysis
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {["v1.2.0", "v1.3.0"].map((version, column) => (
          <div key={version} className="border border-[var(--ink)]/40">
            <div className="border-b border-[var(--ink)]/40 px-3 py-2 font-editorial-mono text-[0.62rem]">
              {version} {column === 0 ? "Current" : "Draft"}
            </div>
            <div className="p-2 font-editorial-mono text-[0.58rem] leading-5">
              {lines.map((line, index) => (
                <div
                  key={`${version}-${index}`}
                  className={`mb-2 grid grid-cols-[1.25rem_1fr] gap-2 p-2 ${
                    column === 0 && index === 1
                      ? "bg-red-50 text-red-900"
                      : column === 1 && index === 1
                        ? "bg-emerald-50 text-emerald-900"
                        : "bg-[var(--paper)]"
                  }`}
                >
                  <span>{index + 4}</span>
                  <span>{line[column]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusVisual() {
  const rows = [
    ["research-summarizer", "Production ready", "bg-emerald-600"],
    ["code-review-checklist", "Needs review", "bg-amber-500"],
    ["market-analysis", "New feedback", "bg-orange-500"],
    ["onboarding-flow", "Production ready", "bg-emerald-600"],
    ["sql-query-helper", "Draft", "bg-[var(--gray)]"],
  ] satisfies Array<[string, string, string]>;

  return (
    <div className="border border-[var(--ink)] bg-[var(--white)] p-5 font-editorial-mono text-[0.68rem]">
      <div className="font-bold uppercase">Skill status</div>
      <div className="mt-5">
        {rows.map(([skill, status, color]) => (
          <div key={skill} className="grid grid-cols-[1fr_auto] gap-4 border-t border-[var(--ink)]/20 py-3">
            <span>{skill}</span>
            <span className="flex items-center gap-2">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${color}`} />
              {status}
            </span>
          </div>
        ))}
      </div>
      <Link href="/dashboard" className="mt-4 block text-right uppercase">
        View all skills +
      </Link>
    </div>
  );
}

function FeatureCard({
  number,
  title,
  body,
  visual,
}: {
  number: string;
  title: string;
  body: string;
  visual: ReactNode;
}) {
  return (
    <article className="grid gap-8 border-b border-[var(--ink)] bg-[var(--paper)] p-6 sm:p-8 lg:grid-cols-[0.9fr_1fr] lg:p-10 odd:lg:border-r">
      <div>
        <div className="font-editorial-serif text-4xl leading-none sm:text-5xl">{number}</div>
        <h3 className="mt-8 max-w-[18rem] font-editorial-sans text-2xl font-semibold leading-tight sm:text-3xl">
          {title}
        </h3>
        <p className="mt-5 max-w-[28rem] text-sm leading-6 text-[var(--ink)]/75">{body}</p>
      </div>
      <div className="self-start">{visual}</div>
    </article>
  );
}

function PersonaCard({
  label,
  items,
  tags,
}: {
  label: string;
  items: string[];
  tags: string[];
}) {
  return (
    <article className="border border-[var(--ink)] bg-[var(--paper)] p-6 sm:p-8">
      <div className="flex items-center gap-3 font-editorial-mono text-[0.72rem] font-bold uppercase">
        <span className="flex h-7 w-7 items-center justify-center border border-[var(--ink)] text-base">
          {label.startsWith("Developer") ? "<>" : "[]"}
        </span>
        {label}
      </div>
      <ul className="mt-7 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6">
            <span aria-hidden className="font-editorial-mono">
              /
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 font-editorial-mono text-[0.64rem] uppercase text-[var(--ink)]/60">
        Top skills
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="border border-[var(--ink)] bg-[var(--white)] px-2 py-1 font-editorial-mono text-[0.62rem]">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

function Header() {
  return (
    <header className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--ink)] bg-[var(--paper)] px-5 py-3 sm:grid-cols-[1fr_auto_1fr] lg:px-8">
      <Link href="/" aria-label="Skillfully home">
        <BrandMark />
      </Link>

      <nav className="order-3 col-span-2 flex items-center justify-center gap-10 font-editorial-mono text-[0.72rem] sm:order-none sm:col-span-1">
        <Link href="/guide" className="py-2 hover:underline">
          Skills Guide
        </Link>
        <Link href="/blog" className="py-2 hover:underline">
          Blog
        </Link>
      </nav>

      <div className="flex items-center justify-end gap-4 font-editorial-mono text-[0.72rem]">
        <Link href="/dashboard" className="hidden py-2 hover:underline sm:inline">
          Sign in
        </Link>
        <Link
          href="/dashboard"
          className="editorial-button editorial-button-dark min-w-20 px-5 py-3 text-[0.72rem]"
        >
          Sign up
        </Link>
      </div>
    </header>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div aria-hidden className="marketing-noise" />

      <div className="relative mx-auto max-w-[1440px] overflow-hidden border-x border-[var(--ink)] bg-[var(--paper)]">
        <Header />

        <section className="grid border-b border-[var(--ink)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-h-[36rem] flex-col justify-center border-b border-[var(--ink)] px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:px-16 xl:px-20">
            <div className="inline-flex max-w-max border border-[var(--ink)] bg-[var(--paper)] px-3 py-2 font-editorial-mono text-[0.68rem] font-bold uppercase">
              AGENT SKILL QA AND ANALYTICS
            </div>

            <h1
              aria-label="THE PLATFORM FOR BUILDING BETTER AGENT SKILLS"
              className="mt-8 max-w-[13ch] font-editorial-sans text-5xl font-bold uppercase leading-none sm:text-6xl lg:text-[4.75rem] xl:text-[5.1rem]"
            >
              <span className="block">THE PLATFORM</span>
              <span className="block">FOR BUILDING</span>
              <span className="block">BETTER</span>
              <span className="block">AGENT SKILLS</span>
            </h1>

            <p className="mt-8 max-w-[39rem] font-editorial-mono text-sm leading-7">
              Create, publish, monitor, and improve agent skills from one workspace.
              Skillfully gives every skill a feedback loop, so authors can see what agents
              use, where they fail, and what to improve next.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="editorial-button editorial-button-dark min-h-12 px-8 py-4 text-[0.72rem]"
              >
                Sign up
              </Link>
              <Link
                href="/guide"
                className="editorial-button min-h-12 bg-[var(--paper)] px-8 py-4 text-[0.72rem] hover:bg-[var(--white)]"
              >
                Read the Skills Guide
              </Link>
            </div>

            <p className="mt-9 max-w-[28rem] font-editorial-mono text-[0.72rem] leading-5">
              Built for people publishing agent skills, from developers to domain experts.
            </p>
          </div>

          <SchematicGraphic />
        </section>

        <MarqueeBand />

        <section className="grid border-b border-[var(--ink)] lg:grid-cols-[0.58fr_1fr]">
          <div className="border-b border-[var(--ink)] px-6 py-12 sm:px-10 lg:border-b-0 lg:border-r lg:px-12">
            <h2 className="max-w-[12ch] font-editorial-sans text-4xl font-medium leading-none sm:text-5xl">
              Agent skills are easy to publish. Hard to improve.
            </h2>
            <p className="mt-8 max-w-[29rem] text-base leading-7 text-[var(--ink)]/75">
              Most skill authors ship instructions and hope agents understand them. When
              something breaks, the feedback is scattered across chats, issues, and user
              complaints. Skillfully gives every published skill a feedback loop.
            </p>
          </div>
          <div className="bg-[var(--white)] px-4 py-8 sm:px-8 lg:px-12">
            <DashboardPreview />
          </div>
        </section>

        <section className="grid lg:grid-cols-2">
          {featureCards.map((feature) => (
            <FeatureCard key={feature.number} {...feature} />
          ))}
        </section>

        <section className="grid border-b border-[var(--ink)] lg:grid-cols-[0.42fr_1fr]">
          <div className="border-b border-[var(--ink)] px-6 py-12 sm:px-10 lg:border-b-0 lg:border-r lg:px-12">
            <h2 className="font-editorial-sans text-4xl font-medium leading-none sm:text-5xl">
              Built for developers and domain experts
            </h2>
            <p className="mt-7 max-w-[25rem] font-editorial-mono text-sm leading-7">
              Some skill authors write code. Others write process knowledge. Skillfully is
              designed for both.
            </p>
          </div>
          <div className="grid gap-5 bg-[var(--white)] p-5 sm:p-8 lg:grid-cols-2">
            {personaCards.map((persona) => (
              <PersonaCard key={persona.label} {...persona} />
            ))}
          </div>
        </section>

        <section className="border-b border-[var(--ink)] px-5 py-10 sm:px-8">
          <h2 className="font-editorial-sans text-4xl font-medium sm:text-5xl">
            A feedback loop for every agent skill
          </h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
            {loopSteps.map((step, index) => (
              <div key={step.number} className="contents">
                <article className="relative min-h-52 border border-[var(--ink)] bg-[var(--paper)] p-6">
                  <div className="font-editorial-serif text-5xl leading-none">{step.number}</div>
                  <h3 className="mt-8 font-editorial-sans text-xl font-semibold">{step.title}</h3>
                  <p className="mt-4 max-w-[18rem] text-sm leading-6 text-[var(--ink)]/75">
                    {step.body}
                  </p>
                  {index === 0 ? (
                    <span
                      aria-hidden
                      className="absolute right-6 top-6 h-10 w-10 border border-dashed border-[var(--ink)]"
                    />
                  ) : null}
                  {index === 1 ? (
                    <RegistrationMark className="right-8 top-7" />
                  ) : null}
                  {index === 2 ? (
                    <span
                      aria-hidden
                      className="absolute right-6 top-6 grid h-10 w-10 grid-cols-3 border border-[var(--ink)]"
                    >
                      {Array.from({ length: 9 }).map((_, cell) => (
                        <span key={cell} className="border border-[var(--ink)]/35" />
                      ))}
                    </span>
                  ) : null}
                </article>
                {index < loopSteps.length - 1 ? (
                  <div className="hidden font-editorial-sans text-5xl lg:block">-&gt;</div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="border-b border-[var(--ink)] px-5 py-10 sm:px-8">
          <h2 className="font-editorial-sans text-4xl font-medium sm:text-5xl">
            Common questions
          </h2>
          <div className="mt-7 border border-[var(--ink)]">
            {faqs.map((faq, index) => (
              <details
                key={faq.question}
                className="group border-b border-[var(--ink)] bg-[var(--paper)] last:border-b-0"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-5 py-5 text-left font-editorial-sans text-lg font-semibold sm:px-6">
                  <span>{faq.question}</span>
                  <span className="font-editorial-sans text-3xl leading-none transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 font-editorial-mono text-[0.72rem] leading-6 sm:px-6">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden bg-[var(--ink)] text-[var(--paper)]">
          <div aria-hidden className="editorial-halftone-light absolute inset-0 opacity-55" />
          <RegistrationMark className="left-8 top-10" light />
          <RegistrationMark className="right-8 top-10" light />
          <RegistrationMark className="bottom-10 left-8" light />
          <RegistrationMark className="bottom-10 right-8" light />

          <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center sm:px-8">
            <h2 className="font-editorial-serif text-5xl leading-none sm:text-6xl">
              Stop guessing how your agent skills perform
            </h2>
            <p className="mt-7 max-w-xl font-editorial-mono text-[0.74rem] leading-6">
              Create your first Skillfully workspace and start improving your skills from
              real usage and real feedback.
            </p>
            <Link
              href="/dashboard"
              className="editorial-button editorial-button-light mt-9 min-h-12 px-10 py-4 text-[0.72rem]"
            >
              Sign up
            </Link>
            <p className="mt-9 font-editorial-mono text-[0.68rem] uppercase">
              Now onboarding early skill authors and design partners.
            </p>
          </div>
        </section>

        <footer className="grid gap-6 px-5 py-6 font-editorial-mono text-[0.72rem] sm:grid-cols-[1fr_auto_1fr] sm:items-center lg:px-8">
          <div>
            <BrandMark />
            <p className="mt-2">QA and analytics for agent skills</p>
          </div>
          <nav className="flex flex-wrap gap-6">
            <Link href="/guide">Skills Guide</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/dashboard">Sign in</Link>
            <Link href="/dashboard">Privacy</Link>
            <Link href="/dashboard">Terms</Link>
          </nav>
          <div className="sm:text-right">© {new Date().getFullYear()} Skillfully Systems Inc.</div>
        </footer>
      </div>
    </main>
  );
}
