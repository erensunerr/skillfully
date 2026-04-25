import Link from "next/link";

const guideSteps = [
  {
    id: "intro",
    label: "Intro",
    title: "What Skillfully measures",
    body: "Skillfully gives every agent skill a feedback endpoint. Each run can report whether the skill worked, what blocked it, and what should change next.",
    bullets: [
      "Use the guide when you are instrumenting the first version of a skill.",
      "Start manually. Repository import is still intentionally coming later.",
    ],
  },
  {
    id: "create",
    label: "Create",
    title: "Create the tracked skill",
    body: "Open the dashboard, name the skill, and let Skillfully generate the skill ID plus its feedback URL.",
    bullets: [
      "Use a name that matches the actual skill file or workflow.",
      "Keep one tracked Skillfully skill per reusable agent skill.",
    ],
  },
  {
    id: "install",
    label: "Install",
    title: "Install the feedback snippet",
    body: "Paste the snippet into the skill instructions so the agent knows when to submit feedback and which endpoint to call.",
    bullets: [
      "Put the snippet near the completion criteria.",
      "Do not make feedback the main work. It should happen after the skill is used.",
    ],
  },
  {
    id: "run",
    label: "Run",
    title: "Run the skill in a real task",
    body: "Use the skill normally. The first useful signal comes from an actual run, not from a perfect-looking setup screen.",
    bullets: [
      "Run it on a task that has a visible result.",
      "Keep the agent's context intact until feedback has been posted.",
    ],
  },
  {
    id: "read-feedback",
    label: "Read Feedback",
    title: "Read the feedback like a product review",
    body: "Positive ratings prove the path worked at least once. Neutral and negative ratings show where the skill needs sharper instructions.",
    bullets: [
      "Sort for repeated blockers before rewriting the whole skill.",
      "Look for missing prerequisites, unclear commands, and vague stop rules.",
    ],
  },
  {
    id: "improve",
    label: "Improve",
    title: "Improve the skill in small edits",
    body: "Patch the instruction that would have prevented the failure, then run the skill again and compare the next feedback batch.",
    bullets: [
      "One instruction change per repeated failure mode is usually enough.",
      "Share the skill only after the feedback pattern stabilizes.",
    ],
  },
] satisfies Array<{
  id: string;
  label: string;
  title: string;
  body: string;
  bullets: string[];
}>;

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[var(--white)] text-[var(--ink)]">
      <div className="border-b border-[var(--ink)] bg-[#0b66ff] px-4 py-3 text-center font-editorial-mono text-[0.68rem] font-bold uppercase text-white sm:text-xs">
        Skillfully guide // create, run, measure, improve agent skills
      </div>

      <header className="border-b border-[var(--ink)] bg-[var(--paper)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link href="/" className="font-editorial-sans text-2xl font-bold uppercase">
            Skillfully
          </Link>
          <nav
            aria-label="Primary navigation"
            className="flex flex-wrap items-center gap-5 font-editorial-mono text-xs font-bold uppercase"
          >
            <Link href="/docs" className="text-[#0b66ff]">
              Guide
            </Link>
            <Link href="/blog">Blog</Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
        </div>
      </header>

      <nav
        aria-label="Resource navigation"
        className="border-b border-[var(--ink)] bg-[var(--paper)]"
      >
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-7 px-5 py-4 font-editorial-mono text-xs uppercase text-neutral-700">
          <Link href="/docs" className="font-bold text-[var(--ink)]">
            Skill Guide
          </Link>
          <Link href="/blog">Articles</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>
      </nav>

      <section className="bg-[var(--ink)] px-5 pb-16 pt-20 text-[var(--white)] sm:pt-24">
        <div className="mx-auto max-w-6xl text-center">
          <p className="font-editorial-mono text-xs font-bold uppercase text-neutral-400">
            Guide // first tracked skill
          </p>
          <h1 className="mx-auto mt-8 max-w-4xl font-editorial-sans text-5xl font-bold leading-none sm:text-7xl">
            The Agent Skills Guide
          </h1>
          <div className="mt-8 flex justify-center gap-5">
            <div className="grid h-12 w-12 place-items-center rounded-full border border-white bg-white text-sm font-bold text-[var(--ink)]">
              SF
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-full border border-white bg-white text-sm font-bold text-[var(--ink)]">
              AI
            </div>
          </div>
          <p className="mt-3 font-editorial-mono text-xs uppercase text-neutral-400">
            Skillfully systems team
          </p>

          <div className="mx-auto mt-14 max-w-5xl rounded-xl bg-white px-5 py-3 text-[var(--ink)]">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {guideSteps.map((step) => (
                <a
                  key={step.id}
                  href={`#${step.id}`}
                  className="border-b-4 border-transparent px-4 py-3 font-editorial-mono text-xs font-bold uppercase hover:border-[#0b66ff] hover:text-[#0b66ff] focus-visible:border-[#0b66ff] focus-visible:outline-none"
                >
                  {step.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,42rem)_17rem] lg:items-start">
          <article className="space-y-14">
            <section id="intro" className="scroll-mt-8">
              <p className="font-editorial-mono text-xs font-bold uppercase text-[#0b66ff]">
                Intro
              </p>
              <h2 className="mt-4 font-editorial-sans text-4xl font-bold leading-tight sm:text-5xl">
                What is an agent skill?
              </h2>
              <div className="mt-8 space-y-6 text-lg leading-9">
                <p>
                  An agent skill is a reusable instruction set for a job an AI agent
                  should do repeatedly. A good skill is not just a prompt. It is a
                  procedure with inputs, proof, limits, and a way to report the outcome.
                </p>
                <p>
                  Skillfully sits at the end of that procedure. It collects the run
                  feedback that tells you whether the skill is helping agents finish real
                  work.
                </p>
              </div>
              <div className="mt-8 border-l-4 border-[#0b66ff] bg-[#f3f5f9] p-6 text-base leading-8">
                <p className="font-bold">The setup is intentionally direct:</p>
                <p className="mt-3">
                  create a tracked skill, paste the snippet, run the skill, then use the
                  feedback to sharpen the next version.
                </p>
              </div>
            </section>

            {guideSteps.slice(1).map((step, index) => (
              <section key={step.id} id={step.id} className="scroll-mt-8">
                <p className="font-editorial-mono text-xs font-bold uppercase text-[#0b66ff]">
                  Step {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-4 font-editorial-sans text-3xl font-bold leading-tight sm:text-4xl">
                  {step.title}
                </h2>
                <p className="mt-6 text-lg leading-9">{step.body}</p>
                <div className="mt-7 rounded-lg bg-[#f3f5f9] p-6">
                  <ul className="space-y-4 text-base leading-8">
                    {step.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span aria-hidden className="mt-3 h-1.5 w-1.5 shrink-0 bg-[#0b66ff]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ))}
          </article>

          <aside className="rounded-lg border border-[var(--ink)] bg-white p-5 lg:sticky lg:top-8">
            <h2 className="font-editorial-sans text-lg font-bold">Table of Contents</h2>
            <ol className="mt-4 space-y-3 font-editorial-mono text-xs uppercase leading-5">
              {guideSteps.map((step) => (
                <li key={step.id}>
                  <a
                    href={`#${step.id}`}
                    className="block rounded bg-[#f3f5f9] px-3 py-2 hover:bg-[#0b66ff] hover:text-white focus-visible:bg-[#0b66ff] focus-visible:text-white focus-visible:outline-none"
                  >
                    {step.label}
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      <section className="border-y border-[#d8dce4] bg-[#f1f4f8] px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="font-editorial-mono text-xs font-bold uppercase text-[#0b66ff]">
            Next guide
          </p>
          <h2 className="mt-4 font-editorial-sans text-4xl font-bold leading-tight">
            Next up: How to write better agent skills
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8">
            Move from setup to authoring. The next article covers the instructions that
            make skills easier for agents to reuse and easier for you to measure.
          </p>
          <Link
            href="/blog/how-to-write-better-agent-skills"
            className="editorial-button editorial-button-dark mt-8 px-6 py-4 text-sm"
          >
            Continue
          </Link>
        </div>
      </section>

      <footer className="bg-[var(--paper)] px-5 py-14">
        <div className="mx-auto grid max-w-5xl gap-8 border-t border-[var(--ink)] pt-10 sm:grid-cols-3">
          <div>
            <p className="font-editorial-sans text-2xl font-bold uppercase">Skillfully</p>
            <p className="mt-3 font-editorial-mono text-xs uppercase text-neutral-600">
              Agent skill feedback
            </p>
          </div>
          <Link href="/blog" className="font-editorial-sans text-xl font-bold">
            Blog
          </Link>
          <Link href="/dashboard" className="font-editorial-sans text-xl font-bold">
            Open dashboard
          </Link>
        </div>
      </footer>
    </main>
  );
}
