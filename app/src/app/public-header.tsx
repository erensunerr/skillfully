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

type PublicHeaderTheme = "light" | "dark";

export function PublicHeader({
  showBookingCta = true,
  theme = "light",
  compactMobile = false,
}: { showBookingCta?: boolean; theme?: PublicHeaderTheme; compactMobile?: boolean } = {}) {
  const isDark = theme === "dark";
  const navLinkClass = [
    "inline-flex min-w-[44px] items-center justify-center hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current",
    compactMobile ? "min-h-8 py-1 sm:min-h-11 sm:py-2" : "min-h-11 py-2",
  ].join(" ");
  const headerClass = `grid min-h-16 grid-cols-[1fr_auto] items-center border-b border-[var(--ink)] px-5 sm:grid-cols-[1fr_auto_1fr] lg:px-8 ${
    compactMobile ? "gap-x-4 gap-y-2 py-2 sm:gap-4 sm:py-3" : "gap-4 py-3"
  } ${
    isDark ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper)] text-[var(--ink)]"
  }`;
  const loginClass = isDark
    ? "inline-flex items-center justify-center rounded-none border border-[var(--paper)] bg-transparent px-3 py-2 font-editorial-sans text-xs font-semibold text-[var(--paper)] transition hover:bg-[var(--paper)] hover:!text-[var(--ink)] sm:px-4 sm:text-sm"
    : "inline-flex items-center justify-center rounded-none border border-[var(--ink)] bg-[var(--white)] px-3 py-2 font-editorial-sans text-xs font-semibold text-[var(--ink)] transition hover:bg-[var(--paper)] sm:px-4 sm:text-sm";
  const bookingClass = isDark
    ? "inline-flex items-center justify-center rounded-none border border-[var(--paper)] bg-[var(--paper)] px-3 py-2 font-editorial-sans text-xs font-semibold text-[var(--ink)] transition hover:bg-transparent hover:text-[var(--paper)] sm:px-4 sm:text-sm"
    : "inline-flex items-center justify-center rounded-none border border-[var(--ink)] bg-[var(--ink)] px-3 py-2 font-editorial-sans text-xs font-semibold text-[var(--paper)] transition hover:bg-[var(--paper)] hover:text-[var(--ink)] sm:px-4 sm:text-sm";

  return (
    <header className={headerClass}>
      <Link
        href="/"
        aria-label="Skillfully home"
        className="inline-flex min-h-11 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
      >
        <BrandMark light={isDark} />
      </Link>

      <nav
        aria-label="Primary navigation"
        className={[
          "order-3 col-span-2 flex items-center justify-center font-editorial-mono font-bold uppercase tracking-[0.08em] sm:order-none sm:col-span-1",
          compactMobile ? "gap-7 text-[0.65rem] sm:gap-10 sm:text-[0.72rem]" : "gap-10 text-[0.72rem]",
        ].join(" ")}
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
          className={loginClass}
        >
          Log in
        </LandingAuthLink>
        {showBookingCta ? (
          <BookingModalCta
            surface="header"
            className={bookingClass}
          >
            <span className="sm:hidden">Book</span>
            <span className="hidden sm:inline">Book onboarding</span>
          </BookingModalCta>
        ) : null}
      </div>
    </header>
  );
}
