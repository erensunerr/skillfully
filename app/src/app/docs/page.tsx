import Link from "next/link";

const guideSteps = [
  {
    number: "01",
    title: "Create a skill",
    body: "Name the agent skill you want to track. Skillfully gives it a unique feedback URL and a snippet you can paste into the skill instructions.",
  },
  {
    number: "02",
    title: "Paste the snippet",
    body: "Add the snippet to the skill so the agent knows when and how to submit a short self-assessment after using that skill.",
  },
  {
    number: "03",
    title: "Collect feedback",
    body: "Run the skill normally. Positive, negative, and neutral feedback appears in the dashboard as responses come in.",
  },
] satisfies Array<{
  number: string;
  title: string;
  body: string;
}>;

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div aria-hidden className="marketing-noise" />
      <div className="relative mx-auto min-h-screen max-w-6xl border-x border-[var(--ink)] bg-[var(--paper)]">
        <header className="flex flex-col gap-4 border-b-[3px] border-[var(--ink)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link href="/" className="font-editorial-sans text-2xl font-bold uppercase">
            Skillfully
          </Link>
          <Link
            href="/dashboard"
            className="editorial-button editorial-button-dark px-4 py-3 text-sm"
          >
            Open dashboard
          </Link>
        </header>

        <section className="border-b-[3px] border-[var(--ink)] bg-[var(--white)] px-6 py-12 sm:px-8 lg:px-12">
          <p className="font-editorial-mono text-sm font-bold uppercase">
            Guide // first tracked skill
          </p>
          <h1 className="mt-5 max-w-3xl font-editorial-sans text-5xl font-bold uppercase leading-none sm:text-7xl">
            Agent skills guide
          </h1>
          <p className="mt-6 max-w-2xl font-editorial-mono text-base leading-8">
            Skillfully tracks how agents use your skills by giving each skill a feedback
            endpoint. Start manually today; repository import will arrive later.
          </p>
        </section>

        <section className="grid lg:grid-cols-3">
          {guideSteps.map((step) => (
            <article
              key={step.number}
              className="min-h-72 border-b-[3px] border-[var(--ink)] bg-[var(--paper)] p-6 lg:border-b-0 lg:border-r last:lg:border-r-0 sm:p-8"
            >
              <p className="font-editorial-serif text-7xl leading-none">{step.number}</p>
              <h2 className="mt-8 font-editorial-sans text-2xl font-bold uppercase">
                {step.title}
              </h2>
              <p className="mt-4 font-editorial-mono text-sm leading-7">{step.body}</p>
            </article>
          ))}
        </section>

        <footer className="flex flex-col gap-4 border-t-[3px] border-[var(--ink)] bg-[var(--ink)] px-6 py-8 text-[var(--paper)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-editorial-mono text-sm uppercase">
            Ready to instrument your first skill?
          </p>
          <Link
            href="/dashboard"
            className="editorial-button editorial-button-light px-4 py-3 text-sm"
          >
            Create skill
          </Link>
        </footer>
      </div>
    </main>
  );
}
