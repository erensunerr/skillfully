import Link from "next/link";

import { BookingModalCta } from "./booking-modal";
import { LandingAuthLink } from "./landing-analytics";

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2 font-editorial-sans text-base font-bold uppercase">
      <span
        aria-hidden
        className={`relative h-5 w-5 shrink-0 rounded-full border-[5px] ${
          light ? "border-[var(--paper)]" : "border-[var(--ink)]"
        }`}
      >
        <span
          className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            light ? "bg-[var(--paper)]" : "bg-[var(--ink)]"
          }`}
        />
      </span>
      <span>Skillfully</span>
    </div>
  );
}

export function PublicHeader({ showBookingCta = true }: { showBookingCta?: boolean } = {}) {
  const navLinkClass =
    "inline-flex min-h-11 min-w-[44px] items-center justify-center py-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current";

  return (
    <header className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--ink)] bg-[var(--paper)] px-5 py-3 text-[var(--ink)] sm:grid-cols-[1fr_auto_1fr] lg:px-8">
      <Link
        href="/"
        aria-label="Skillfully home"
        className="inline-flex min-h-11 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
      >
        <BrandMark />
      </Link>

      <nav
        aria-label="Primary navigation"
        className="order-3 col-span-2 flex items-center justify-center gap-10 font-editorial-mono text-[0.72rem] font-bold uppercase tracking-[0.08em] sm:order-none sm:col-span-1"
      >
        <Link href="/guide" className={navLinkClass}>
          Skills Guide
        </Link>
        <Link href="/blog" className={navLinkClass}>
          Blog
        </Link>
      </nav>
      <div className="justify-self-end flex items-center justify-end gap-2 sm:gap-3">
        <LandingAuthLink
          href="/dashboard"
          intent="sign_in"
          surface="header"
          className="inline-flex items-center justify-center rounded-md border border-[var(--ink)] bg-[var(--white)] px-3 py-2 font-editorial-sans text-xs font-semibold text-[var(--ink)] transition hover:bg-[var(--paper)] sm:px-4 sm:text-sm"
        >
          Log in
        </LandingAuthLink>
        {showBookingCta ? (
          <BookingModalCta
            surface="header"
            className="inline-flex items-center justify-center rounded-md border border-[var(--ink)] bg-[var(--ink)] px-3 py-2 font-editorial-sans text-xs font-semibold text-[var(--paper)] transition hover:bg-[var(--paper)] hover:text-[var(--ink)] sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">Book</span>
            <span className="hidden sm:inline">Book onboarding</span>
          </BookingModalCta>
        ) : null}
      </div>
    </header>
  );
}
