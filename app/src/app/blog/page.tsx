import Link from "next/link";
import { blogArticles } from "@/content/blog";

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[var(--white)] text-[var(--ink)]">
      <div className="border-b border-[var(--ink)] bg-[#0b66ff] px-4 py-3 text-center font-editorial-mono text-[0.68rem] font-bold uppercase text-white sm:text-xs">
        Skillfully articles // authoring, analytics, distribution
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
            <Link href="/guide">Guide</Link>
            <Link href="/blog" className="text-[#0b66ff]">
              Blog
            </Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
        </div>
      </header>

      <section className="bg-[var(--ink)] px-5 py-20 text-center text-[var(--white)] sm:py-24">
        <p className="font-editorial-mono text-xs font-bold uppercase text-neutral-400">
          Published notes
        </p>
        <h1 className="mx-auto mt-8 max-w-4xl font-editorial-sans text-5xl font-bold leading-none sm:text-7xl">
          Skillfully Blog
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-neutral-300">
          Practical writing on agent skill authoring, feedback loops, and measuring
          whether reusable instructions actually work.
        </p>
      </section>

      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto grid max-w-5xl gap-6">
          {blogArticles.map((article, index) => (
            <article
              key={article.slug}
              className="grid gap-6 border-t border-[var(--ink)] py-8 lg:grid-cols-[8rem_minmax(0,1fr)_auto] lg:items-start"
            >
              <p className="font-editorial-mono text-xs font-bold uppercase text-[#0b66ff]">
                {String(index + 1).padStart(2, "0")} // {article.category}
              </p>
              <div>
                <h2 className="font-editorial-sans text-3xl font-bold leading-tight sm:text-4xl">
                  <Link href={`/blog/${article.slug}`}>{article.title}</Link>
                </h2>
                <p className="mt-4 max-w-2xl text-lg leading-8">{article.subtitle}</p>
                <p className="mt-5 font-editorial-mono text-xs uppercase text-neutral-600">
                  {article.publishedAt} / {article.readTime} / {article.author}
                </p>
              </div>
              <Link
                href={`/blog/${article.slug}`}
                className="editorial-button editorial-button-dark px-5 py-3 text-xs"
              >
                Read
              </Link>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--ink)] bg-[var(--paper)] px-5 py-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-editorial-mono text-xs font-bold uppercase">
            New here? Start with the guide.
          </p>
          <Link href="/guide" className="editorial-button editorial-button-dark px-5 py-3 text-xs">
            Open guide
          </Link>
        </div>
      </footer>
    </main>
  );
}
