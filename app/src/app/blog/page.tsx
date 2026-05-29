import Link from "next/link";

import { AuthorByline } from "@/app/article-author";
import { PublicHeader } from "@/app/public-header";
import { blogArticles } from "@/content/blog";

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div aria-hidden className="marketing-noise" />
      <div className="relative mx-auto max-w-[1440px] overflow-hidden border-x border-[var(--ink)] bg-[var(--paper)]">
        <PublicHeader />

        <section className="border-b border-[var(--ink)] bg-[var(--ink)] px-5 py-20 text-center text-[var(--paper)] sm:py-24">
          <p className="font-editorial-mono text-xs font-bold uppercase text-[var(--paper)]/60">
            Published notes
          </p>
          <h1 className="mx-auto mt-8 max-w-4xl font-editorial-sans text-5xl font-bold leading-none sm:text-7xl">
            Skillfully Blog
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-[var(--paper)]/75">
            Practical writing on agent skill authoring, feedback loops, and measuring whether
            reusable instructions actually work.
          </p>
        </section>

        <section className="bg-[var(--white)] px-5 py-16 sm:py-24">
          <div className="mx-auto grid max-w-5xl gap-6">
            {blogArticles.map((article, index) => (
              <article
                key={article.slug}
                className="grid gap-6 border-t border-[var(--ink)] py-8 lg:grid-cols-[8rem_minmax(0,1fr)_auto] lg:items-start"
              >
                <p className="font-editorial-mono text-xs font-bold uppercase text-[var(--ink)]/60">
                  {String(index + 1).padStart(2, "0")} // {article.category}
                </p>
                <div>
                  <h2 className="font-editorial-sans text-3xl font-bold leading-tight sm:text-4xl">
                    <Link
                      href={`/blog/${article.slug}`}
                      className="inline-block min-h-11 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
                    >
                      {article.title}
                    </Link>
                  </h2>
                  <p className="mt-4 max-w-2xl text-lg leading-8">{article.subtitle}</p>
                  <AuthorByline
                    area="blog-card"
                    author={article.author}
                    className="mt-6"
                    meta={[article.publishedAt, article.readTime]}
                  />
                </div>
                <Link
                  href={`/blog/${article.slug}`}
                  className="editorial-button editorial-button-dark min-h-11 px-5 py-3 text-xs"
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
            <Link
              href="/guide"
              className="editorial-button editorial-button-dark min-h-11 px-5 py-3 text-xs"
            >
              Open guide
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
