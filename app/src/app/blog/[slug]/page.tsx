import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AuthorByline } from "@/app/article-author";
import { PublicHeader } from "@/app/public-header";
import {
  blogArticles,
  getBlogArticle,
  getNextArticle,
} from "@/content/blog";

type BlogArticleRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return blogArticles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogArticleRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getBlogArticle(slug);

  if (!article) {
    return {
      title: "Article not found",
    };
  }

  return {
    title: `${article.title} | Skillfully Blog`,
    description: article.subtitle,
  };
}

function ArticleMarkdown({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p>{children}</p>,
        ul: ({ children }) => (
          <ul className="space-y-4 border border-[var(--ink)] bg-[var(--paper)] p-6">
            {children}
          </ul>
        ),
        li: ({ children }) => (
          <li className="flex gap-3">
            <span aria-hidden className="mt-3 h-1.5 w-1.5 shrink-0 bg-[var(--ink)]" />
            <span>{children}</span>
          </li>
        ),
        blockquote: ({ children }) => (
          <aside className="border-l-4 border-[var(--ink)] bg-[var(--paper)] p-6">
            {children}
          </aside>
        ),
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        a: ({ children, href }) => (
          <a
            href={href}
            className="font-semibold underline decoration-[0.08em] underline-offset-4"
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel={href?.startsWith("http") ? "noreferrer" : undefined}
          >
            {children}
          </a>
        ),
        h3: ({ children }) => (
          <h3 className="font-editorial-sans text-2xl font-bold leading-tight sm:text-3xl">
            {children}
          </h3>
        ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}

export default async function BlogArticlePage({ params }: BlogArticleRouteProps) {
  const { slug } = await params;
  const article = getBlogArticle(slug);

  if (!article) {
    notFound();
  }

  const nextArticle = getNextArticle(article);

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div aria-hidden className="marketing-noise" />
      <div className="relative mx-auto max-w-[1440px] overflow-hidden border-x border-[var(--ink)] bg-[var(--paper)]">
        <PublicHeader />

        <section className="overflow-hidden border-b border-[var(--ink)] bg-[var(--ink)] px-5 pb-16 pt-20 text-center text-[var(--paper)] sm:pt-24">
          <p className="font-editorial-mono text-xs font-bold uppercase text-[var(--paper)]/60">
            {article.category} / {article.publishedAt}
          </p>
          <h1 className="mx-auto mt-8 max-w-[12ch] font-editorial-sans text-4xl font-bold leading-none sm:max-w-4xl sm:text-7xl">
            {article.title}
          </h1>
          <p className="mx-auto mt-8 max-w-[24ch] text-lg leading-8 text-[var(--paper)]/75 sm:max-w-2xl">
            {article.subtitle}
          </p>
          <AuthorByline
            area="blog-article"
            author={article.author}
            className="mt-8 w-full justify-center"
            dark
            meta={[article.publishedAt, article.readTime]}
          />
        </section>

        <section className="bg-[var(--white)] px-5 py-16 sm:py-24">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,42rem)_17rem] lg:items-start">
            <article className="space-y-14 text-lg leading-9">
              {article.sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-8">
                  <h2 className="font-editorial-sans text-3xl font-bold leading-tight sm:text-4xl">
                    {section.title}
                  </h2>
                  <div className="mt-6 space-y-6">
                    <ArticleMarkdown markdown={section.markdown} />
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
                href={`/blog/${nextArticle.slug}`}
                className="editorial-button editorial-button-dark mt-8 min-h-11 px-6 py-4 text-sm"
              >
                Continue
              </Link>
            </div>
          </section>
        ) : null}

        <footer className="bg-[var(--paper)] px-5 py-14">
          <div className="mx-auto flex max-w-5xl flex-col gap-5 border-t border-[var(--ink)] pt-10 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/blog" className="inline-flex min-h-11 min-w-[44px] items-center justify-center font-editorial-sans text-xl font-bold">
              Blog
            </Link>
            <Link href="/guide" className="inline-flex min-h-11 min-w-[44px] items-center justify-center font-editorial-sans text-xl font-bold">
              Skills Guide
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
