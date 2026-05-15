import * as fs from "node:fs";
import * as path from "node:path";

const matter = require("gray-matter");
const { unified } = require("unified");
const remarkParse = require("remark-parse").default;
const remarkStringify = require("remark-stringify").default;

import {
  skillfullyEditorialAuthor,
  type ArticleAuthor,
} from "./authors";

export type BlogArticleSection = {
  id: string;
  title: string;
  markdown: string;
};

export type BlogArticle = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  publishedAt: string;
  publishedAtSortKey: number;
  readTime: string;
  author: ArticleAuthor;
  sections: BlogArticleSection[];
  nextSlug?: string;
};

type BlogFrontmatter = {
  title?: unknown;
  subtitle?: unknown;
  category?: unknown;
  publishedAt?: unknown;
  readTime?: unknown;
  author?: unknown;
  nextSlug?: unknown;
};

const BLOG_CONTENT_DIR = path.join(process.cwd(), "content", "blog");

const authorMap: Record<string, ArticleAuthor> = {
  "skillfully-editorial": skillfullyEditorialAuthor,
};

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function nodeText(node: any): string {
  if (!node) {
    return "";
  }

  if (typeof node.value === "string") {
    return node.value;
  }

  if (Array.isArray(node.children)) {
    return node.children.map((child: any) => nodeText(child)).join("");
  }

  return "";
}

function stringifyNodes(nodes: any[]) {
  if (!nodes.length) {
    return "";
  }

  return unified().use(remarkStringify).stringify({
    type: "root",
    children: nodes,
  });
}

function parseSections(body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    return [] as BlogArticleSection[];
  }

  const tree = unified().use(remarkParse).parse(trimmed) as { children?: any[] };
  const children = tree.children ?? [];
  const sections: BlogArticleSection[] = [];
  const idCounts = new Map<string, number>();
  let currentSection: { title: string; nodes: any[] } | null = null;

  for (const node of children) {
    if (node.type === "heading" && node.depth === 2) {
      if (currentSection) {
        const baseId = slugifyHeading(currentSection.title);
        const seen = (idCounts.get(baseId) ?? 0) + 1;
        idCounts.set(baseId, seen);
        sections.push({
          id: seen === 1 ? baseId : `${baseId}-${seen}`,
          title: currentSection.title,
          markdown: stringifyNodes(currentSection.nodes).trim(),
        });
      }

      currentSection = {
        title: nodeText(node).trim(),
        nodes: [],
      };
      continue;
    }

    if (!currentSection) {
      throw new Error("Blog content must start with a level-two heading (## Title). Add an H2 before body copy.");
    }

    currentSection.nodes.push(node);
  }

  if (currentSection) {
    const baseId = slugifyHeading(currentSection.title);
    const seen = (idCounts.get(baseId) ?? 0) + 1;
    idCounts.set(baseId, seen);
    sections.push({
      id: seen === 1 ? baseId : `${baseId}-${seen}`,
      title: currentSection.title,
      markdown: stringifyNodes(currentSection.nodes).trim(),
    });
  }

  return sections;
}

function requireString(value: unknown, field: string, slug: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Blog post \"${slug}\" is missing required field \"${field}\".`);
  }
  return value.trim();
}

function normalizePublishedDate(value: unknown, slug: string) {
  const parsed =
    value instanceof Date
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? new Date(value)
        : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    throw new Error(`Blog post \"${slug}\" has an invalid or missing \"publishedAt\" value.`);
  }

  return {
    display: parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }),
    sortKey: parsed.getTime(),
  };
}

function loadBlogArticleFromFile(filePath: string): BlogArticle {
  const source = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(source);
  const slug = path.basename(filePath).replace(/\.mdx?$/, "");
  const frontmatter = data as BlogFrontmatter;
  const authorKey = requireString(frontmatter.author, "author", slug);
  const author = authorMap[authorKey];

  if (!author) {
    throw new Error(`Blog post \"${slug}\" references unknown author key \"${authorKey}\".`);
  }

  const normalizedPublishedAt = normalizePublishedDate(frontmatter.publishedAt, slug);

  return {
    slug,
    title: requireString(frontmatter.title, "title", slug),
    subtitle: requireString(frontmatter.subtitle, "subtitle", slug),
    category: requireString(frontmatter.category, "category", slug),
    publishedAt: normalizedPublishedAt.display,
    publishedAtSortKey: normalizedPublishedAt.sortKey,
    readTime: requireString(frontmatter.readTime, "readTime", slug),
    author,
    nextSlug:
      typeof frontmatter.nextSlug === "string" && frontmatter.nextSlug.trim().length > 0
        ? frontmatter.nextSlug.trim()
        : undefined,
    sections: parseSections(content),
  };
}

function compareArticles(a: BlogArticle, b: BlogArticle) {
  const dateComparison = b.publishedAtSortKey - a.publishedAtSortKey;

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return a.slug.localeCompare(b.slug);
}

function loadBlogArticles() {
  if (!fs.existsSync(BLOG_CONTENT_DIR)) {
    return [] as BlogArticle[];
  }

  const articles = fs
    .readdirSync(BLOG_CONTENT_DIR)
    .filter((fileName) => /\.mdx?$/.test(fileName))
    .map((fileName) => loadBlogArticleFromFile(path.join(BLOG_CONTENT_DIR, fileName)))
    .sort(compareArticles);

  const knownSlugs = new Set(articles.map((article) => article.slug));
  for (const article of articles) {
    if (article.nextSlug && !knownSlugs.has(article.nextSlug)) {
      throw new Error(`Blog post \"${article.slug}\" references missing nextSlug \"${article.nextSlug}\".`);
    }
  }

  return articles;
}

export const blogArticles: BlogArticle[] = loadBlogArticles();

export const __internal = {
  parseSections,
};

export function getBlogArticle(slug: string) {
  return blogArticles.find((article) => article.slug === slug);
}

export function getNextArticle(article: BlogArticle) {
  const nextSlug = article.nextSlug;

  if (!nextSlug) {
    return undefined;
  }

  return getBlogArticle(nextSlug);
}
