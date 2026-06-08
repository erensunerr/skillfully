"use client";

import Link from "next/link";

export function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2 font-editorial-sans text-xl font-bold uppercase">
      <span aria-hidden className="relative h-6 w-6 rounded-full border-[6px] border-[var(--ink)]">
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ink)]" />
      </span>
      <span>Skillfully</span>
    </Link>
  );
}

export function DashboardIcon({ name }: { name: string }) {
  if (name === "overview") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />
      </svg>
    );
  }

  if (name === "editor") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m4 16 12-12 4 4L8 20H4v-4Z" />
        <path d="m14 6 4 4" />
      </svg>
    );
  }

  if (name === "analytics") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 17 9 12l4 3 7-9" />
        <path d="M18 6h2v2" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
      </svg>
    );
  }

  if (name === "account") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    );
  }

  return null;
}

export function StatusIcon({ name }: { name: string }) {
  const base = "h-6 w-6";

  if (name === "warning") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3 2.8 20h18.4L12 3Z" />
        <path d="M12 9v5M12 17h.01" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </svg>
    );
  }

  if (name === "x") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6M15 9l-6 6" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 12h3l2-6 4 12 3-8 2 2h4" />
    </svg>
  );
}

export function TargetIcon({ name }: { name: string }) {
  const iconClass = "h-7 w-7";

  if (name === "terminal") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="4" width="18" height="16" />
        <path d="m7 9 3 3-3 3M12 16h5" />
      </svg>
    );
  }

  if (name === "github") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className={iconClass} fill="currentColor">
        <path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.8 9.6.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1.1-2.7-.1-.3-.5-1.3.1-2.7 0 0 .9-.3 2.8 1.1.8-.2 1.7-.3 2.5-.3.9 0 1.7.1 2.5.3 1.9-1.4 2.8-1.1 2.8-1.1.6 1.4.2 2.4.1 2.7.7.8 1.1 1.6 1.1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.7c0 .3.2.6.7.5 4-1.3 6.8-5.1 6.8-9.6C22 6.6 17.5 2 12 2Z" />
      </svg>
    );
  }

  if (name === "triangle") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className={iconClass} fill="currentColor">
        <path d="M12 3 22 21H2L12 3Zm0 6-3.8 8h7.6L12 9Z" />
      </svg>
    );
  }

  if (name === "square") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="5" y="5" width="14" height="14" />
        <path d="M8 12h8M12 8v8" />
      </svg>
    );
  }

  return (
    <svg aria-hidden viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="6" y="5" width="9" height="11" />
      <path d="M3 12H2V2h9v1" />
    </svg>
  );
}

export function CheckCircleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
      <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm3.8 6.5-4.5 4.6-2.4-2.4 1-1 1.4 1.4 3.5-3.6 1 1Z" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13 13 4 4" />
    </svg>
  );
}

export function FileGlyph({ locked = false }: { locked?: boolean }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center border border-[var(--ink)]">
      {locked ? (
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="5" y="8" width="10" height="8" />
          <path d="M7 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      ) : (
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M5 2h7l3 3v13H5V2Z" />
          <path d="M12 2v4h4M7 10h6M7 13h6" />
        </svg>
      )}
    </span>
  );
}
