import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthorByline } from "@/app/article-author";
import {
  blogArticles,
  getBlogArticle,
  getNextArticle,
  type ArticleBlock,
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

function ArticleBlockView({ block }: { block: ArticleBlock }) {
  if (block.type === "paragraph") {
    return <p>{block.text}</p>;
  }

  if (block.type === "list") {
    return (
      <ul className="space-y-4 rounded-lg bg-[#f3f5f9] p-6">
        {block.items.map((item) => (
          <li key={item} className="flex gap-3">
            <span aria-hidden className="mt-3 h-1.5 w-1.5 shrink-0 bg-[#0b66ff]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <aside className="border-l-4 border-[#0b66ff] bg-[#f3f5f9] p-6">
      <p className="font-bold">{block.title}</p>
      <div className="mt-4 space-y-4">
        {block.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </aside>
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
    <main className="min-h-screen bg-[var(--white)] text-[var(--ink)]">
      <div className="border-b border-[var(--ink)] bg-[#0b66ff] px-4 py-3 text-center font-editorial-mono text-[0.68rem] font-bold uppercase text-white sm:text-xs">
        Skillfully blog // {article.category}
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

      <section className="overflow-hidden bg-[var(--ink)] px-5 pb-16 pt-20 text-center text-[var(--white)] sm:pt-24">
        <p className="font-editorial-mono text-xs font-bold uppercase text-neutral-400">
          {article.category} / {article.publishedAt}
        </p>
        <h1 className="mx-auto mt-8 max-w-[12ch] font-editorial-sans text-4xl font-bold leading-none sm:max-w-4xl sm:text-7xl">
          {article.title}
        </h1>
        <p className="mx-auto mt-8 max-w-[24ch] text-lg leading-8 text-neutral-300 sm:max-w-2xl">
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

      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,42rem)_17rem] lg:items-start">
          <article className="space-y-14 text-lg leading-9">
            {article.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-8">
                <h2 className="font-editorial-sans text-3xl font-bold leading-tight sm:text-4xl">
                  {section.title}
                </h2>
                <div className="mt-6 space-y-6">
                  {section.blocks.map((block, index) => (
                    <ArticleBlockView key={`${section.id}-${index}`} block={block} />
                  ))}
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
              href={`/blog/${nextArticle.slug}`}
              className="editorial-button editorial-button-dark mt-8 px-6 py-4 text-sm"
            >
              Continue
            </Link>
          </div>
        </section>
      ) : null}

      <footer className="bg-[var(--paper)] px-5 py-14">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 border-t border-[var(--ink)] pt-10 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/blog" className="font-editorial-sans text-xl font-bold">
            Blog
          </Link>
          <Link href="/guide" className="font-editorial-sans text-xl font-bold">
            Guide
          </Link>
        </div>
      </footer>
    </main>
  );
}
