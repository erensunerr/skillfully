import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

const HERO_GRID_STYLE: CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, rgba(8, 8, 8, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(8, 8, 8, 0.1) 1px, transparent 1px)",
  backgroundSize: "50px 50px",
};

const TRUSTED_BY_COPY =
  "USED BY EARLY ADOPTERS BUILDING AGENT SKILLS ON CLAUDE, CURSOR, AND GOOSE. +++";

const steps = [
  {
    number: "01",
    title: "Create a skill",
    description:
      "Name your skill in the dashboard. You get a unique skill ID and a pre-filled snippet ready to copy. No complex onboarding, just immediate credential generation.",
    icon: (
      <svg
        aria-hidden
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="20" cy="20" r="18" />
        <path d="M20 10V30M10 20H30" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Paste the snippet",
    description:
      "Drop it into your skill.md. That's the entire integration: no SDK, no config file, and no extra application code to maintain.",
    icon: (
      <svg
        aria-hidden
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="5" y="5" width="30" height="30" />
        <path d="M5 20H35M20 5V35" strokeDasharray="4 4" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Read the feedback",
    description:
      "Every agent invocation posts a self-assessment back. You see exactly what worked, what failed, and why, straight from the runtime behavior of the agent.",
    icon: (
      <svg
        aria-hidden
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M5 35L35 5M5 5L35 35" />
        <circle cx="20" cy="20" r="10" fill="currentColor" />
      </svg>
    ),
  },
] satisfies Array<{
  number: string;
  title: string;
  description: string;
  icon: ReactNode;
}>;

function CornerMarks({ light = false }: { light?: boolean }) {
  const tone = light ? " light" : "";

  return (
    <>
      <span aria-hidden className={`corner-mark corner-tl${tone}`} />
      <span aria-hidden className={`corner-mark corner-tr${tone}`} />
    </>
  );
}

function RegistrationMark({
  className = "",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`registration-mark${light ? " light" : ""}${className ? ` ${className}` : ""}`}
    />
  );
}

function HeroGraphic() {
  return (
    <svg
      aria-hidden
      className="hero-schematic absolute -left-[10%] -top-[10%] z-[2] h-[120%] w-[120%] text-[var(--ink)] opacity-80"
      viewBox="0 0 500 500"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeWidth="1.5">
        <circle cx="250" cy="250" r="100" strokeDasharray="4 4" />
        <circle cx="250" cy="250" r="80" />
        <circle cx="250" cy="250" r="40" fill="currentColor" />
        <line x1="250" y1="150" x2="250" y2="0" />
        <line x1="250" y1="350" x2="250" y2="500" />
        <line x1="150" y1="250" x2="0" y2="250" />
        <line x1="350" y1="250" x2="500" y2="250" />
        <circle cx="250" cy="50" r="15" fill="var(--white)" />
        <rect x="235" y="35" width="30" height="30" strokeWidth="1" />
        <circle cx="450" cy="250" r="25" strokeDasharray="2 2" />
        <path d="M440 250H460M450 240V260" />
        <circle cx="50" cy="250" r="10" fill="currentColor" />
        <polygon points="250,150 350,250 250,350 150,250" strokeWidth="0.5" />
        <polygon points="250,170 330,250 250,330 170,250" strokeWidth="0.5" />
        <path d="M150 250Q200 100 250 50" />
        <path d="M350 250Q300 400 250 450" />
      </g>
      <text
        x="20"
        y="30"
        fill="currentColor"
        fontFamily="var(--font-jetbrains-mono)"
        fontSize="10"
      >
        FIG. 01 — NODE INTEGRATION
      </text>
      <text
        x="380"
        y="470"
        fill="currentColor"
        fontFamily="var(--font-jetbrains-mono)"
        fontSize="10"
      >
        LAT: 40.7128° N
      </text>
      <text
        x="380"
        y="485"
        fill="currentColor"
        fontFamily="var(--font-jetbrains-mono)"
        fontSize="10"
      >
        LNG: 74.0060° W
      </text>
    </svg>
  );
}

function BarcodeRail() {
  return (
    <aside className="absolute inset-y-0 right-0 z-[3] flex w-14 flex-col items-center border-l border-[var(--ink)] bg-[var(--paper)] px-2 py-8 sm:w-[4.5rem]">
      <svg
        aria-hidden
        className="h-[18rem] w-9"
        preserveAspectRatio="none"
        viewBox="0 0 100 300"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="10" y="0" width="5" height="300" fill="var(--ink)" />
        <rect x="25" y="0" width="15" height="300" fill="var(--ink)" />
        <rect x="45" y="0" width="2" height="300" fill="var(--ink)" />
        <rect x="52" y="0" width="8" height="300" fill="var(--ink)" />
        <rect x="70" y="0" width="20" height="300" fill="var(--ink)" />
        <rect x="95" y="0" width="3" height="300" fill="var(--ink)" />
      </svg>
      <div className="vertical-rl mt-8 font-editorial-mono text-[0.68rem] uppercase tracking-[0.18em]">
        <span className="font-editorial-sans text-base font-semibold tracking-[-0.05em]">
          SKILLFULLY
        </span>{" "}
        // DATA COLLECTION MATRIX
      </div>
    </aside>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div aria-hidden className="marketing-noise" />

      <div className="relative mx-auto min-h-screen max-w-[1600px] overflow-hidden border-x border-[var(--ink)] bg-[var(--paper)]">
        <header className="relative grid grid-cols-[1fr_auto] items-center gap-4 border-b-[3px] border-[var(--ink)] px-4 py-4 sm:grid-cols-[1fr_auto_1fr] sm:px-8">
          <CornerMarks />

          <div className="hidden gap-6 font-editorial-mono text-[0.68rem] uppercase tracking-[0.18em] sm:flex">
            <span>SYS_ID // 042.88.A</span>
            <span>STATUS: NOMINAL</span>
          </div>

          <div className="flex items-center gap-4 justify-self-start sm:justify-self-center">
            <div className="h-6 w-6 rounded-full bg-[var(--ink)] [mask-image:radial-gradient(circle_at_center,transparent_30%,black_31%)] [-webkit-mask-image:radial-gradient(circle_at_center,transparent_30%,black_31%)]" />
            <span className="font-editorial-sans text-2xl font-semibold uppercase tracking-[-0.08em] sm:text-[1.55rem]">
              Skillfully
            </span>
          </div>

          <Link
            href="/dashboard"
            className="editorial-button editorial-button-dark justify-self-end px-4 py-3 text-[0.78rem]"
          >
            Login [→]
          </Link>
        </header>

        <section className="relative grid min-h-[calc(100vh-84px)] border-b-[3px] border-[var(--ink)] lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <RegistrationMark className="left-[2%] top-[20%] hidden lg:block" />

          <div className="relative z-[2] flex flex-col justify-center border-b border-[var(--ink)] px-6 py-14 sm:px-10 lg:border-b-0 lg:border-r lg:px-16 lg:py-20 xl:px-20">
            <div className="mb-10 inline-flex max-w-max border border-[var(--ink)] bg-[var(--paper)] px-3 py-2 font-editorial-mono text-[0.72rem] uppercase tracking-[0.18em]">
              <span className="mr-2 bg-[var(--ink)] px-2 py-0.5 text-[var(--paper)]">OBJ:</span>
              Agent skills analytics
            </div>

            <h1 className="max-w-[11ch] text-[clamp(3.2rem,7vw,6.25rem)] font-bold uppercase leading-[0.9] tracking-[-0.06em]">
              Know which of your <br className="hidden sm:block" />
              <span className="my-1 inline-block bg-[var(--ink)] px-[0.18em] py-[0.04em] text-[var(--paper)]">
                AGENT SKILLS
              </span>
              <br className="hidden sm:block" />
              <span className="font-editorial-serif text-[1.08em] font-normal normal-case tracking-normal">
                work —
              </span>{" "}
              and which don&apos;t.
            </h1>

            <p className="mt-8 max-w-[60ch] font-editorial-mono text-[clamp(1rem,1.4vw,1.24rem)] leading-7 text-[var(--ink)]">
              Every time an agent uses your skill, it posts a self-assessment back.
              You see ratings and feedback without lifting a finger. Expose the blind
              spots in your AI&apos;s tooling.
            </p>

            <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              <Link
                href="/dashboard"
                className="editorial-button editorial-button-dark px-6 py-4 text-base sm:px-8 sm:text-lg"
              >
                Start collecting feedback
              </Link>

              <div className="max-w-[12rem] font-editorial-mono text-[0.72rem] uppercase tracking-[0.18em]">
                NO SDK REQUIRED.
                <br />
                READY IN 30S.
              </div>
            </div>
          </div>

          <div className="relative min-h-[26rem] overflow-hidden bg-[var(--white)]">
            <div aria-hidden className="absolute inset-0" style={HERO_GRID_STYLE} />
            <div aria-hidden className="editorial-halftone absolute inset-[10%] z-[1] opacity-70" />
            <HeroGraphic />
            <BarcodeRail />
          </div>
        </section>

        <section className="grid gap-5 border-b-[3px] border-[var(--ink)] bg-[var(--white)] px-6 py-6 sm:grid-cols-[auto_1fr] sm:items-center sm:px-8">
          <div className="font-editorial-mono text-[0.72rem] font-bold uppercase tracking-[0.18em]">
            [ TRUSTED_BY ]
          </div>
          <div className="overflow-hidden whitespace-nowrap">
            <div className="editorial-marquee-track inline-flex min-w-max gap-10 font-editorial-mono text-lg uppercase tracking-[0.12em]">
              <span>{TRUSTED_BY_COPY}</span>
              <span>{TRUSTED_BY_COPY}</span>
            </div>
          </div>
        </section>

        <section className="flex flex-col">
          <div className="flex items-end justify-between gap-8 border-b border-[var(--ink)] px-6 py-8 sm:px-8 lg:px-10">
            <h2 className="font-editorial-sans text-[clamp(3rem,6vw,6rem)] leading-[0.9] tracking-[-0.05em]">
              Three Steps
            </h2>
            <div className="hidden text-right font-editorial-mono text-[0.72rem] uppercase tracking-[0.18em] sm:block">
              PROCEDURE_DOC
              <br />
              REV. 2026.1
            </div>
          </div>

          <div className="grid lg:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.number}
                className="step-card-polish relative flex flex-col border-b-[3px] border-[var(--ink)] bg-[var(--paper)] transition-colors duration-200 hover:bg-[var(--white)] lg:border-b-0 lg:border-r last:lg:border-r-0"
              >
                {index === 0 ? <span aria-hidden className="corner-mark corner-tl" /> : null}
                {index === steps.length - 1 ? (
                  <span aria-hidden className="corner-mark corner-tr" />
                ) : null}

                <div className="flex items-start justify-between border-b border-[var(--ink)] px-6 py-8 font-editorial-serif text-7xl italic leading-none sm:px-8">
                  <span>{step.number}</span>
                  <span className="mt-2 text-[var(--ink)]">{step.icon}</span>
                </div>

                <div className="flex flex-1 flex-col px-6 py-8 sm:px-8">
                  <h3 className="font-editorial-sans text-[1.65rem] uppercase tracking-[-0.04em]">
                    {step.title}
                  </h3>
                  <p className="mt-4 font-editorial-mono text-[0.95rem] leading-7 text-[var(--ink)]/80">
                    {step.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="relative overflow-hidden bg-[var(--ink)] text-[var(--paper)]">
          <div aria-hidden className="editorial-halftone-light absolute inset-0 z-[1] opacity-70" />
          <RegistrationMark className="left-1/2 top-12 hidden -translate-x-1/2 sm:block" light />

          <div className="relative z-[2] mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center sm:px-8">
            <div className="font-editorial-mono text-[0.72rem] uppercase tracking-[0.18em] text-[var(--gray)]">
              // INITIATE_PROTOCOL
            </div>

            <h2 className="mt-6 font-editorial-serif text-[clamp(3rem,6vw,5.7rem)] font-normal leading-[0.92]">
              Ready to stop guessing?
            </h2>

            <p className="mt-6 max-w-2xl font-editorial-mono text-[1rem] leading-8 text-[var(--paper)]/90">
              Join a small group of early adopters building better skills with real
              feedback.
            </p>

            <Link
              href="/dashboard"
              className="editorial-button editorial-button-light mt-10 px-6 py-4 text-sm sm:px-8"
            >
              Get started free — it takes 30 seconds
            </Link>
          </div>

          <div className="relative z-[2] flex flex-col gap-3 border-t border-[var(--paper)]/30 px-6 py-4 font-editorial-mono text-[0.72rem] uppercase tracking-[0.18em] sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>© {new Date().getFullYear()} Skillfully Systems</div>
            <div className="flex items-center gap-5">
              <Link href="/docs" className="transition-opacity hover:opacity-70">
                Docs
              </Link>
              <span>END_OF_TRANSMISSION █</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
