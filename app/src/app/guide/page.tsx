import Link from "next/link";
import { guideArticles } from "@/content/guide";

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[var(--white)] text-[var(--ink)]">
      <div className="border-b border-[var(--ink)] bg-[#0b66ff] px-4 py-3 text-center font-editorial-mono text-[0.68rem] font-bold uppercase text-white sm:text-xs">
        Skillfully guide // five articles for better agent skills
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
            <Link href="/guide" className="text-[#0b66ff]">
              Guide
            </Link>
            <Link href="/blog">Blog</Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
        </div>
      </header>

      <section className="bg-[var(--ink)] px-5 pb-16 pt-20 text-[var(--white)] sm:pt-24">
        <div className="mx-auto max-w-6xl text-center">
          <p className="font-editorial-mono text-xs font-bold uppercase text-neutral-400">
            Guide / agent skill lifecycle
          </p>
          <h1 className="mx-auto mt-8 max-w-4xl font-editorial-sans text-5xl font-bold leading-none sm:text-7xl">
            The Agent Skills Guide
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-neutral-300">
            5 articles. 5 sections each. A practical path from first skill to measured,
            reusable workflow.
          </p>

          <div className="mx-auto mt-14 max-w-5xl rounded-xl bg-white px-5 py-3 text-[var(--ink)]">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {guideArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/guide/${article.slug}`}
                  className="border-b-4 border-transparent px-4 py-3 font-editorial-mono text-xs font-bold uppercase hover:border-[#0b66ff] hover:text-[#0b66ff] focus-visible:border-[#0b66ff] focus-visible:outline-none"
                >
                  {article.number}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6">
            {guideArticles.map((article) => (
              <article
                key={article.slug}
                className="grid gap-6 border-t border-[var(--ink)] py-8 lg:grid-cols-[8rem_minmax(0,1fr)_auto] lg:items-start"
              >
                <p className="font-editorial-mono text-xs font-bold uppercase text-[#0b66ff]">
                  {article.number} / 5 sections
                </p>
                <div>
                  <h2 className="font-editorial-sans text-3xl font-bold leading-tight sm:text-4xl">
                    <Link href={`/guide/${article.slug}`}>{article.title}</Link>
                  </h2>
                  <p className="mt-4 max-w-2xl text-lg leading-8">{article.subtitle}</p>
                  <ol className="mt-6 grid gap-2 font-editorial-mono text-xs uppercase text-neutral-600 sm:grid-cols-2">
                    {article.sections.map((section) => (
                      <li key={section.id}>{section.title}</li>
                    ))}
                  </ol>
                </div>
                <Link
                  href={`/guide/${article.slug}`}
                  className="editorial-button editorial-button-dark px-5 py-3 text-xs"
                >
                  Read
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--ink)] bg-[var(--paper)] px-5 py-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-editorial-mono text-xs font-bold uppercase">
            Start with the first article, then move in sequence.
          </p>
          <Link
            href="/guide/start-with-agent-skills"
            className="editorial-button editorial-button-dark px-5 py-3 text-xs"
          >
            Begin
          </Link>
        </div>
      </footer>
    </main>
  );
}
