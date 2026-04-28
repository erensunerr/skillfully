import type { ArticleAuthor } from "@/content/authors";

export function AuthorByline({
  area,
  author,
  className = "",
  dark = false,
  meta = [],
}: {
  area: string;
  author: ArticleAuthor;
  className?: string;
  dark?: boolean;
  meta?: string[];
}) {
  const mutedText = dark ? "text-neutral-400" : "text-neutral-600";
  const avatarClass = dark
    ? "border-[var(--white)] bg-[var(--white)] text-[var(--ink)]"
    : "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]";

  return (
    <div
      data-author-area={area}
      className={`flex max-w-full flex-col items-center gap-3 sm:flex-row ${className}`}
    >
      <span
        data-author-avatar="true"
        aria-hidden
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border font-editorial-mono text-[0.68rem] font-bold uppercase ${avatarClass}`}
      >
        {author.initials}
      </span>
      <div className="min-w-0 max-w-full text-center sm:text-left">
        <p className="font-editorial-sans text-sm font-semibold">{author.name}</p>
        <p
          className={`mx-auto max-w-[24ch] break-words font-editorial-mono text-[0.64rem] uppercase leading-5 sm:mx-0 sm:max-w-none ${mutedText}`}
        >
          {[author.role, ...meta].join(" / ")}
        </p>
      </div>
    </div>
  );
}
