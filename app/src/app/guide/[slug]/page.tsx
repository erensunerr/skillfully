import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGuideArticle,
  getNextGuideArticle,
  guideArticles,
} from "@/content/guide";

type GuideArticleRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return guideArticles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: GuideArticleRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getGuideArticle(slug);

  if (!article) {
    return {
      title: "Guide article not found",
    };
  }

  return {
    title: `${article.title} | Skillfully Guide`,
    description: article.subtitle,
  };
}

export default async function GuideArticlePage({ params }: GuideArticleRouteProps) {
  const { slug } = await params;
  const article = getGuideArticle(slug);

  if (!article) {
    notFound();
  }

  const nextArticle = getNextGuideArticle(article);

  return (
    <main className="min-h-screen bg-[var(--white)] text-[var(--ink)]">
      <div className="border-b border-[var(--ink)] bg-[#0b66ff] px-4 py-3 text-center font-editorial-mono text-[0.68rem] font-bold uppercase text-white sm:text-xs">
        Skillfully guide / article {article.number}
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

      <section className="bg-[var(--ink)] px-5 pb-16 pt-20 text-center text-[var(--white)] sm:pt-24">
        <p className="font-editorial-mono text-xs font-bold uppercase text-neutral-400">
          Article {article.number} / 5 sections
        </p>
        <h1 className="mx-auto mt-8 max-w-4xl font-editorial-sans text-5xl font-bold leading-none sm:text-7xl">
          {article.title}
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-neutral-300">
          {article.subtitle}
        </p>

        <div className="mx-auto mt-14 max-w-5xl rounded-xl bg-white px-5 py-3 text-[var(--ink)]">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {guideArticles.map((candidate) => (
              <Link
                key={candidate.slug}
                href={`/guide/${candidate.slug}`}
                className={`border-b-4 px-4 py-3 font-editorial-mono text-xs font-bold uppercase focus-visible:outline-none ${
                  candidate.slug === article.slug
                    ? "border-[#0b66ff] text-[#0b66ff]"
                    : "border-transparent hover:border-[#0b66ff] hover:text-[#0b66ff] focus-visible:border-[#0b66ff]"
                }`}
              >
                {candidate.number}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,42rem)_17rem] lg:items-start">
          <article className="space-y-14 text-lg leading-9">
            {article.sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-8">
                <p className="font-editorial-mono text-xs font-bold uppercase text-[#0b66ff]">
                  Section {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-4 font-editorial-sans text-3xl font-bold leading-tight sm:text-4xl">
                  {section.title}
                </h2>
                <p className="mt-6">{section.body}</p>
                <div className="mt-7 rounded-lg bg-[#f3f5f9] p-6">
                  <ul className="space-y-4 text-base leading-8">
                    {section.bullets.map((bullet) => (
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
              {article.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block rounded bg-[#f3f5f9] px-3 py-2 hover:bg-[#0b66ff] hover:text-white focus-visible:bg-[#0b66ff] focus-visible:text-white focus-visible:outline-none"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      {nextArticle ? (
        <section className="border-y border-[#d8dce4] bg-[#f1f4f8] px-5 py-16">
          <div className="mx-auto max-w-5xl">
            <p className="font-editorial-mono text-xs font-bold uppercase text-[#0b66ff]">
              Next up
            </p>
            <h2 className="mt-4 font-editorial-sans text-4xl font-bold leading-tight">
              {nextArticle.title}
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8">{nextArticle.subtitle}</p>
            <Link
              href={`/guide/${nextArticle.slug}`}
              className="editorial-button editorial-button-dark mt-8 px-6 py-4 text-sm"
            >
              Continue
            </Link>
          </div>
        </section>
      ) : (
        <section className="border-y border-[#d8dce4] bg-[#f1f4f8] px-5 py-16">
          <div className="mx-auto max-w-5xl">
            <p className="font-editorial-mono text-xs font-bold uppercase text-[#0b66ff]">
              Final article
            </p>
            <h2 className="mt-4 font-editorial-sans text-4xl font-bold leading-tight">
              Keep improving from live feedback
            </h2>
            <Link href="/dashboard" className="editorial-button editorial-button-dark mt-8 px-6 py-4 text-sm">
              Open dashboard
            </Link>
          </div>
        </section>
      )}

      <footer className="bg-[var(--paper)] px-5 py-14">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 border-t border-[var(--ink)] pt-10 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/guide" className="font-editorial-sans text-xl font-bold">
            Guide
          </Link>
          <Link href="/blog" className="font-editorial-sans text-xl font-bold">
            Blog
          </Link>
        </div>
      </footer>
    </main>
  );
}
