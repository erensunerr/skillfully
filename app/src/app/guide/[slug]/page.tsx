import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthorByline } from "@/app/article-author";
import { PublicHeader } from "@/app/public-header";
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
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div aria-hidden className="marketing-noise" />
      <div className="relative mx-auto max-w-[1440px] overflow-hidden border-x border-[var(--ink)] bg-[var(--paper)]">
        <PublicHeader />

        <section className="overflow-hidden border-b border-[var(--ink)] bg-[var(--ink)] px-5 pb-16 pt-20 text-center text-[var(--paper)] sm:pt-24">
          <p className="font-editorial-mono text-xs font-bold uppercase text-[var(--paper)]/60">
            Article {article.number} / 5 sections
          </p>
          <h1 className="mx-auto mt-8 max-w-[12ch] font-editorial-sans text-4xl font-bold leading-none sm:max-w-4xl sm:text-7xl">
            {article.title}
          </h1>
          <p className="mx-auto mt-8 max-w-[24ch] text-lg leading-8 text-[var(--paper)]/75 sm:max-w-2xl">
            {article.subtitle}
          </p>
          <AuthorByline
            area="guide-article"
            author={article.author}
            className="mt-8 w-full justify-center"
            dark
            meta={[`Article ${article.number}`, "5 sections"]}
          />

          <div className="mx-auto mt-14 max-w-5xl border border-[var(--paper)] bg-[var(--paper)] px-5 py-3 text-[var(--ink)]">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {guideArticles.map((candidate) => (
                <Link
                  key={candidate.slug}
                  href={`/guide/${candidate.slug}`}
                  aria-current={candidate.slug === article.slug ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center border px-4 py-3 font-editorial-mono text-xs font-bold uppercase focus-visible:outline-none ${
                    candidate.slug === article.slug
                      ? "border-[var(--ink)] bg-[var(--paper-muted)] text-[var(--ink)]"
                      : "border-transparent hover:border-[var(--ink)] hover:bg-[var(--paper-muted)] focus-visible:border-[var(--ink)] focus-visible:bg-[var(--paper-muted)]"
                  }`}
                >
                  {candidate.number}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--white)] px-5 py-16 sm:py-24">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,42rem)_17rem] lg:items-start">
            <article className="space-y-14 text-lg leading-9">
              {article.sections.map((section, index) => (
                <section key={section.id} id={section.id} className="scroll-mt-8">
                  <p className="font-editorial-mono text-xs font-bold uppercase text-[var(--ink)]/60">
                    Section {String(index + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-4 font-editorial-sans text-3xl font-bold leading-tight sm:text-4xl">
                    {section.title}
                  </h2>
                  <p className="mt-6">{section.body}</p>
                  <div className="mt-7 border border-[var(--ink)] bg-[var(--paper)] p-6">
                    <ul className="space-y-4 text-base leading-8">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3">
                          <span aria-hidden className="mt-3 h-1.5 w-1.5 shrink-0 bg-[var(--ink)]" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              ))}
            </article>

            <aside className="border border-[var(--ink)] bg-[var(--paper)] p-5 lg:sticky lg:top-8">
              <h2 className="font-editorial-sans text-lg font-bold">Table of Contents</h2>
              <ol className="mt-4 space-y-3 font-editorial-mono text-xs uppercase leading-5">
                {article.sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block min-h-11 border border-[var(--ink)] bg-[var(--white)] px-3 py-3 text-[var(--ink)] hover:bg-[var(--paper-muted)] focus-visible:bg-[var(--paper-muted)] focus-visible:outline-none"
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
          <section className="border-y border-[var(--ink)] bg-[var(--paper)] px-5 py-16">
            <div className="mx-auto max-w-5xl">
              <p className="font-editorial-mono text-xs font-bold uppercase text-[var(--ink)]/60">
                Next up
              </p>
              <h2 className="mt-4 font-editorial-sans text-4xl font-bold leading-tight">
                {nextArticle.title}
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8">{nextArticle.subtitle}</p>
              <Link
                href={`/guide/${nextArticle.slug}`}
                className="editorial-button editorial-button-dark mt-8 min-h-11 px-6 py-4 text-sm"
              >
                Continue
              </Link>
            </div>
          </section>
        ) : (
          <section className="border-y border-[var(--ink)] bg-[var(--paper)] px-5 py-16">
            <div className="mx-auto max-w-5xl">
              <p className="font-editorial-mono text-xs font-bold uppercase text-[var(--ink)]/60">
                Final article
              </p>
              <h2 className="mt-4 font-editorial-sans text-4xl font-bold leading-tight">
                Keep improving from live feedback
              </h2>
              <Link
                href="/dashboard"
                className="editorial-button editorial-button-dark mt-8 min-h-11 px-6 py-4 text-sm"
              >
                Open dashboard
              </Link>
            </div>
          </section>
        )}

        <footer className="bg-[var(--paper)] px-5 py-14">
          <div className="mx-auto flex max-w-5xl flex-col gap-5 border-t border-[var(--ink)] pt-10 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/guide" className="inline-flex min-h-11 min-w-[44px] items-center justify-center font-editorial-sans text-xl font-bold">
              Skills Guide
            </Link>
            <Link href="/blog" className="inline-flex min-h-11 min-w-[44px] items-center justify-center font-editorial-sans text-xl font-bold">
              Blog
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
