"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { type AppSchema } from "@/instant.schema";
import { type InstaQLEntity, id } from "@instantdb/react";
import type { User as InstantUser } from "@instantdb/core";
import {
  resolveDashboardViewState,
  shouldShowOnboardingModalByDefault,
} from "./view-state";
import { OnboardingModal } from "./onboarding-modal";
import posthog from "posthog-js";

type Skill = InstaQLEntity<AppSchema, "skills">;
type Feedback = InstaQLEntity<AppSchema, "feedback">;
type AppUser = InstantUser;
type Screen = "list" | "create" | "detail";
type AuthPhase = "request" | "verify";

type AuthForm = {
  email: string;
  code: string;
};

type SkillForm = {
  name: string;
  description: string;
};

type RecentFeedbackRow = {
  sentiment: "positive" | "neutral" | "negative";
  rating: string;
  feedback: string;
  version: string;
};

const DASHBOARD_CARD = "border border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)]";
const DASHBOARD_PANEL = "border border-[var(--ink)] bg-[var(--white)] text-[var(--ink)]";
const DASHBOARD_BUTTON =
  "editorial-button editorial-button-dark px-4 py-3 text-[0.72rem]";
const DASHBOARD_BUTTON_LIGHT =
  "editorial-button bg-[var(--paper)] px-4 py-3 text-[0.72rem] hover:bg-[var(--white)]";
const DASHBOARD_INPUT =
  "mt-2 w-full border border-[var(--ink)] bg-[var(--white)] px-3 py-3 font-editorial-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]";

const FEEDBACK_SNIPPET_URL = "/feedback-template.md";

const fallbackFeedbackRows: RecentFeedbackRow[] = [
  {
    sentiment: "positive",
    rating: "5/5",
    feedback: "Great job! This solved my issue in seconds.",
    version: "v2.3.0",
  },
  {
    sentiment: "positive",
    rating: "4/5",
    feedback: "Very helpful and accurate responses. Thank you!",
    version: "v2.3.0",
  },
  {
    sentiment: "neutral",
    rating: "3/5",
    feedback: "It works, but sometimes the answers are generic.",
    version: "v2.2.0",
  },
  {
    sentiment: "negative",
    rating: "2/5",
    feedback: "Takes too long to respond on the app.",
    version: "v2.2.0",
  },
  {
    sentiment: "negative",
    rating: "1/5",
    feedback: "Got an error while trying to authenticate my account.",
    version: "v2.3.0",
  },
];

const healthRows = [
  ["Performance", "99.1% uptime", "wave"],
  ["Error rate", "0.6%", "warning"],
  ["Response time (p95)", "1.3s", "clock"],
  ["Successful runs", "6,492", "check"],
  ["Failed runs", "39", "x"],
  ["Safety incidents", "0", "shield"],
] satisfies Array<[string, string, string]>;

const attentionRows = [
  {
    tone: "bg-red-600",
    title: "Spikes in negative feedback (authentication)",
    body: "18 negative ratings in the last 7 days",
  },
  {
    tone: "bg-amber-500",
    title: "High response latency (retry module)",
    body: "p95 response time above 1.2s",
  },
  {
    tone: "bg-amber-500",
    title: "Error rate increased on mobile clients",
    body: "0.6% error rate on mobile vs 0.2% on web",
  },
] satisfies Array<{ tone: string; title: string; body: string }>;

const publishingTargets = [
  ["skills.sh", "Published", "v2.3.0", "View on skills.sh", "terminal"],
  ["GitHub", "Published", "v2.3.0", "View on GitHub", "github"],
  ["agentskills.io", "Published", "v2.3.0", "View on agentskills.io", "triangle"],
  ["Skillfully directory", "Coming soon", "-", "Learn more", "circle"],
] satisfies Array<[string, string, string, string, string]>;

const versionRows = [
  ["v2.3.0", "Published", "May 8, 2025", "Improved authentication flow and reduced response latency."],
  ["v2.2.0", "Published", "May 1, 2025", "Added retry module and mobile performance improvements."],
  ["v2.1.0", "Published", "Apr 24, 2025", "Expanded FAQ coverage and improved intent detection."],
  ["v2.0.0", "Published", "Apr 15, 2025", "Major rewrite with new plugin architecture."],
  ["v1.0.0", "Published", "Apr 1, 2025", "Initial public release."],
] satisfies Array<[string, string, string, string]>;

function randomSkillId() {
  const chars = "abcdefghijkmnopqrstuvwxyz23456789";
  let out = "sk_";
  for (let i = 0; i < 10; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function toMillis(value: number | Date | null | undefined) {
  if (typeof value === "number") {
    return value;
  }
  return value instanceof Date ? value.getTime() : 0;
}

function ratingSummary(feedback: Feedback[]) {
  return {
    positive: feedback.filter((entry) => entry.rating === "positive").length,
    negative: feedback.filter((entry) => entry.rating === "negative").length,
    neutral: feedback.filter((entry) => entry.rating === "neutral").length,
  };
}

function renderFeedbackTemplate(template: string, skillId: string) {
  const feedbackUrl = `https://www.skillfully.sh/feedback/${skillId}`;
  return template.replaceAll("{{feedbackUrl}}", feedbackUrl);
}

function displayUserEmail(user: AppUser | null | undefined) {
  return user?.email || "authenticated user";
}

function extractErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Something went wrong";
  }

  if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message?: string }).message ?? "Something went wrong";
  }

  const maybeBody = (error as { body?: unknown }).body;
  if (
    typeof maybeBody === "object" &&
    maybeBody !== null &&
    "message" in (maybeBody as { message?: unknown }) &&
    typeof (maybeBody as { message?: unknown }).message === "string"
  ) {
    return String((maybeBody as { message?: string }).message);
  }

  return "Something went wrong";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2 font-editorial-sans text-xl font-bold uppercase">
      <span aria-hidden className="relative h-6 w-6 rounded-full border-[6px] border-[var(--ink)]">
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ink)]" />
      </span>
      <span>Skillfully</span>
    </Link>
  );
}

function DashboardIcon({ name }: { name: string }) {
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

  return null;
}

function StatusIcon({ name }: { name: string }) {
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

function TargetIcon({ name }: { name: string }) {
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

  return (
    <svg aria-hidden viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 3H3v10h10v-3" />
      <path d="M9 3h4v4M8 8l5-5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="6" y="5" width="9" height="11" />
      <path d="M3 12H2V2h9v1" />
    </svg>
  );
}

function AuthForm({
  phase,
  form,
  email,
  onEmailSubmit,
  onVerifySubmit,
  onEmailChange,
  onCodeChange,
  onChangeMode,
  disabled,
  message,
}: {
  phase: AuthPhase;
  form: AuthForm;
  email: string;
  onEmailSubmit: () => void;
  onVerifySubmit: () => void;
  onEmailChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onChangeMode: () => void;
  disabled: boolean;
  message: string;
}) {
  const isRequest = phase === "request";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] p-6 text-[var(--ink)]">
      <div className="w-full max-w-md space-y-3">
        <div className={`${DASHBOARD_PANEL} p-6`}>
          <p className="font-editorial-mono text-xs font-bold uppercase">Skillfully account</p>
          <h2 className="mt-4 font-editorial-sans text-3xl font-bold">Continue to dashboard</h2>

          <p className="mt-3 text-sm leading-6">
            {isRequest
              ? "Enter your email. We will send a one-time code."
              : `We sent a code to ${email}.`}
          </p>

          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (isRequest) {
                onEmailSubmit();
              } else {
                onVerifySubmit();
              }
            }}
          >
            {isRequest ? (
              <label className="block font-editorial-mono text-xs font-bold uppercase">
                Email
                <input
                  type="email"
                  className={DASHBOARD_INPUT}
                  value={form.email}
                  onChange={(event) => onEmailChange(event.currentTarget.value)}
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  minLength={3}
                />
              </label>
            ) : (
              <label className="block font-editorial-mono text-xs font-bold uppercase">
                Verification code
                <input
                  type="text"
                  className={`${DASHBOARD_INPUT} text-center tracking-[0.3em]`}
                  value={form.code}
                  onChange={(event) => onCodeChange(event.currentTarget.value)}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                />
              </label>
            )}

            <button
              type="submit"
              disabled={disabled}
              className={`${DASHBOARD_BUTTON} w-full disabled:opacity-50`}
            >
              {isRequest ? "Send code" : "Verify code"}
            </button>
          </form>

          {isRequest ? null : (
            <button
              type="button"
              className="mt-4 font-editorial-mono text-xs font-bold uppercase underline"
              onClick={onChangeMode}
            >
              Use a different email
            </button>
          )}

          {message ? (
            <p className="mt-4 border border-red-600 bg-red-50 p-3 font-editorial-mono text-xs font-bold uppercase text-red-700">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function SkillForm({
  form,
  onSubmit,
  onCancel,
  onInputChange,
}: {
  form: SkillForm;
  onSubmit: (name: string, description: string) => void;
  onCancel: () => void;
  onInputChange: (value: SkillForm) => void;
}) {
  return (
    <section className={`${DASHBOARD_PANEL} mx-auto w-full max-w-3xl p-6 sm:p-8`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">Editor</p>
      <h2 className="mt-4 font-editorial-sans text-4xl font-bold">Create a skill</h2>
      <form
        className="mt-6 space-y-5"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onSubmit(form.name.trim(), form.description.trim());
        }}
      >
        <label className="block font-editorial-mono text-xs font-bold uppercase">
          Name
          <input
            value={form.name}
            className={DASHBOARD_INPUT}
            onChange={(event) => onInputChange({ ...form, name: event.currentTarget.value })}
            required
            name="name"
            placeholder='"code-review" or "write-tests"'
          />
        </label>
        <label className="block font-editorial-mono text-xs font-bold uppercase">
          Description (optional)
          <textarea
            value={form.description}
            className={`${DASHBOARD_INPUT} min-h-28`}
            onChange={(event) => onInputChange({ ...form, description: event.currentTarget.value })}
            name="description"
            placeholder="What does this skill do?"
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" className={DASHBOARD_BUTTON}>
            Create skill
          </button>
          <button type="button" className={DASHBOARD_BUTTON_LIGHT} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function DashboardSidebar({
  user,
  skills,
  selectedId,
  onSelect,
  onOpenEditor,
  onSignOut,
}: {
  user: AppUser;
  skills: Skill[];
  selectedId: string | null;
  onSelect: (skill: Skill) => void;
  onOpenEditor: () => void;
  onSignOut: () => void;
}) {
  const selectedValue = selectedId ?? skills[0]?.id ?? "";

  return (
    <aside className="flex min-h-0 flex-col border-b border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] lg:sticky lg:top-0 lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r">
      <div className="border-b border-[var(--ink)] px-5 py-6">
        <BrandMark />
      </div>

      <div className="px-5 py-7">
        <label className="block font-editorial-mono text-xs font-bold uppercase">
          Skill
          <select
            className="mt-3 w-full border border-[var(--ink)] bg-[var(--paper)] px-3 py-3 font-editorial-sans text-sm"
            value={selectedValue}
            disabled={skills.length === 0}
            onChange={(event) => {
              const nextSkill = skills.find((skill) => skill.id === event.currentTarget.value);
              if (nextSkill) {
                onSelect(nextSkill);
              }
            }}
          >
            {skills.length === 0 ? (
              <option value="">No skills yet</option>
            ) : (
              skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      <nav className="border-y border-[var(--ink)] font-editorial-sans text-sm">
        <button
          type="button"
          className="flex w-full items-center gap-3 border-l-4 border-[var(--ink)] bg-[var(--white)] px-5 py-4 text-left font-semibold"
        >
          <DashboardIcon name="overview" />
          Overview
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[var(--white)]"
          onClick={onOpenEditor}
        >
          <DashboardIcon name="editor" />
          Editor
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[var(--white)]"
        >
          <DashboardIcon name="analytics" />
          Analytics
        </button>
      </nav>

      <div className="mt-auto px-5 py-6">
        <div className="mb-5 border-t border-[var(--ink)]" />
        <button
          type="button"
          className="mb-4 flex w-full items-center gap-3 py-2 text-left text-sm"
        >
          <DashboardIcon name="settings" />
          Settings
        </button>
        <p className="truncate font-editorial-mono text-[0.68rem] text-[var(--ink)]/65">
          {displayUserEmail(user)}
        </p>
        <button
          type="button"
          className="mt-2 font-editorial-mono text-[0.68rem] font-bold uppercase underline"
          onClick={onSignOut}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

function EmptyState({
  onCreate,
  onOpenOnboarding,
}: {
  onCreate: () => void;
  onOpenOnboarding: () => void;
}) {
  return (
    <section className={`${DASHBOARD_PANEL} mx-auto w-full max-w-3xl p-6 sm:p-8`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">Overview</p>
      <h2 className="mt-5 font-editorial-sans text-4xl font-bold">No skills yet.</h2>
      <p className="mt-4 max-w-xl text-base leading-7">
        Add your first skill to start collecting feedback and previewing the dashboard.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" className={DASHBOARD_BUTTON} onClick={onOpenOnboarding}>
          Choose setup path
        </button>
        <button type="button" className={DASHBOARD_BUTTON_LIGHT} onClick={onCreate}>
          Create skill directly
        </button>
      </div>
    </section>
  );
}

function MiniSparkline({ variant = "success" }: { variant?: "success" | "users" }) {
  const path =
    variant === "success"
      ? "M4 40 20 38 35 30 51 34 66 25 82 30 98 22 114 15 130 25 146 18 162 12 178 19 194 10"
      : "M4 42 18 42 32 35 46 39 60 30 74 36 88 25 102 28 116 22 130 32 144 18 158 10 172 17 194 8";

  return (
    <svg aria-hidden viewBox="0 0 200 58" className="mt-8 h-20 w-full text-[var(--ink)]">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
      {Array.from({ length: 11 }).map((_, index) => (
        <circle
          key={index}
          cx={4 + index * 19}
          cy={variant === "success" ? 40 - index * 2.7 + (index % 3) * 6 : 42 - index * 2.9 + (index % 2) * 5}
          r="2.2"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

function MetricCard({
  label,
  value,
  delta,
  chart,
}: {
  label: string;
  value: string;
  delta: string;
  chart: "success" | "users";
}) {
  return (
    <article className={`${DASHBOARD_CARD} p-6 sm:p-8`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">{label}</p>
      <div className="mt-8 font-editorial-sans text-5xl font-semibold sm:text-6xl">
        {value}
      </div>
      <p className="mt-4 font-editorial-sans text-base">
        <span className="font-bold text-emerald-700">↑ {delta}</span> vs last 7 days
      </p>
      <MiniSparkline variant={chart} />
    </article>
  );
}

function UsageChart() {
  return (
    <section className={`${DASHBOARD_CARD} p-6 sm:p-8`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-editorial-mono text-xs font-bold uppercase">Usage over time</p>
          <div className="mt-10 flex flex-wrap gap-8 text-sm">
            <span>Total interactions <strong className="ml-3 font-semibold">6,842</strong></span>
            <span className="hidden h-6 border-l border-[var(--ink)]/30 sm:inline-block" />
            <span>Avg. daily <strong className="ml-3 font-semibold">977</strong></span>
          </div>
        </div>
        <select
          aria-label="Usage chart date range"
          className="w-fit border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 font-editorial-sans text-sm"
          defaultValue="7"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
      </div>

      <div className="mt-8 overflow-x-auto">
        <svg
          aria-label="Usage chart"
          viewBox="0 0 860 330"
          className="h-[20rem] min-w-[48rem] text-[var(--ink)]"
          role="img"
        >
          {[58, 120, 182, 244, 306].map((y) => (
            <line key={y} x1="68" y1={y} x2="830" y2={y} stroke="currentColor" strokeOpacity="0.22" strokeDasharray="2 3" />
          ))}
          <line x1="68" y1="306" x2="830" y2="306" stroke="currentColor" />
          <text x="16" y="62" className="fill-current font-editorial-sans text-sm">2K</text>
          <text x="16" y="124" className="fill-current font-editorial-sans text-sm">1.5K</text>
          <text x="16" y="186" className="fill-current font-editorial-sans text-sm">1K</text>
          <text x="16" y="248" className="fill-current font-editorial-sans text-sm">500</text>
          <text x="16" y="310" className="fill-current font-editorial-sans text-sm">0</text>
          <path
            d="M70 268 88 240 107 228 124 206 142 226 158 198 174 247 192 176 210 242 229 214 246 201 264 214 282 207 300 235 318 268 336 224 354 246 372 219 390 244 408 172 426 230 444 96 462 178 480 154 498 192 516 226 534 238 552 210 570 246 588 258 606 236 624 218 642 204 660 218 678 196 696 236 714 176 732 122 750 178 768 204 786 224 804 194 822 172"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          {["May 2", "May 3", "May 4", "May 5", "May 6", "May 7", "May 8"].map((label, index) => (
            <text key={label} x={90 + index * 118} y="326" className="fill-current font-editorial-sans text-sm">
              {label}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}

function SkillHealth() {
  return (
    <section className={`${DASHBOARD_CARD} p-6 sm:p-8`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">Skill health</p>
      <div className="mt-6">
        {healthRows.map(([label, value, icon]) => (
          <div key={label} className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-4 border-t border-[var(--ink)]/25 py-4 first:border-t-0">
            <StatusIcon name={icon} />
            <span className="text-sm sm:text-base">{label}</span>
            <span className="text-right text-sm sm:text-base">{value}</span>
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
          </div>
        ))}
      </div>
    </section>
  );
}

function AttentionPanel() {
  return (
    <section className={`${DASHBOARD_CARD} p-6`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">Needs attention</p>
      <div className="mt-6 space-y-6">
        {attentionRows.map((row) => (
          <button key={row.title} type="button" className="grid w-full grid-cols-[0.7rem_1fr_auto] gap-4 text-left">
            <span aria-hidden className={`mt-2 h-2.5 w-2.5 rounded-full ${row.tone}`} />
            <span>
              <span className="block font-editorial-sans text-base font-semibold">{row.title}</span>
              <span className="mt-1 block text-sm text-[var(--ink)]/70">{row.body}</span>
            </span>
            <span aria-hidden className="text-2xl leading-none">›</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SentimentPanel({ entries }: { entries: Feedback[] }) {
  const counts = ratingSummary(entries);
  const total = counts.positive + counts.neutral + counts.negative;
  const percentages =
    total > 0
      ? {
          positive: Math.round((counts.positive / total) * 100),
          neutral: Math.round((counts.neutral / total) * 100),
          negative: Math.round((counts.negative / total) * 100),
        }
      : {
          positive: 68,
          neutral: 22,
          negative: 10,
        };

  return (
    <section className={`${DASHBOARD_CARD} p-6`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">
        Feedback sentiment <span className="ml-2 font-normal">(last 30 days)</span>
      </p>
      <div className="mt-7 space-y-7">
        {[
          ["Positive", percentages.positive, "bg-emerald-700"],
          ["Neutral", percentages.neutral, "bg-[var(--gray)]"],
          ["Negative", percentages.negative, "bg-red-600"],
        ].map(([label, value, color]) => (
          <div key={label as string} className="grid grid-cols-[5rem_1fr_3rem] items-center gap-5">
            <div className="flex items-center gap-3">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${color}`} />
              <span className="text-sm">{label}</span>
            </div>
            <div className="h-2 bg-[var(--ink)]/10">
              <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
            </div>
            <span className="text-right text-sm">{value}%</span>
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-between border-t border-[var(--ink)] pt-5 text-sm">
        <span>Total</span>
        <span>100%</span>
      </div>
    </section>
  );
}

function feedbackRowsFromEntries(entries: Feedback[]) {
  if (entries.length === 0) {
    return fallbackFeedbackRows;
  }

  return [...entries]
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .slice(0, 5)
    .map((entry): RecentFeedbackRow => {
      const sentiment =
        entry.rating === "negative" ? "negative" : entry.rating === "neutral" ? "neutral" : "positive";

      return {
        sentiment,
        rating: sentiment === "positive" ? "5/5" : sentiment === "neutral" ? "3/5" : "1/5",
        feedback: entry.feedback,
        version: "v2.3.0",
      };
    });
}

function SentimentBadge({ sentiment }: { sentiment: RecentFeedbackRow["sentiment"] }) {
  const classes = {
    positive: "border-emerald-700 bg-emerald-50 text-emerald-800",
    neutral: "border-[var(--gray)] bg-[var(--white)] text-[var(--ink)]",
    negative: "border-red-600 bg-red-50 text-red-700",
  };

  return (
    <span className={`inline-flex border px-2 py-1 font-editorial-sans text-xs ${classes[sentiment]}`}>
      {sentiment[0].toUpperCase() + sentiment.slice(1)}
    </span>
  );
}

function RecentFeedbackTable({ entries }: { entries: Feedback[] }) {
  const rows = feedbackRowsFromEntries(entries);

  return (
    <section className={`${DASHBOARD_CARD} overflow-hidden`}>
      <div className="p-6 pb-3">
        <p className="font-editorial-mono text-xs font-bold uppercase">Recent feedback</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead className="font-editorial-mono text-xs uppercase">
            <tr className="border-b border-[var(--ink)]/25">
              <th className="px-6 py-4 font-bold">Sentiment</th>
              <th className="px-4 py-4 font-bold">Rating</th>
              <th className="px-4 py-4 font-bold">Feedback</th>
              <th className="px-6 py-4 text-right font-bold">Version</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.feedback}-${index}`} className="border-b border-[var(--ink)]/20 last:border-b-0">
                <td className="px-6 py-4">
                  <SentimentBadge sentiment={row.sentiment} />
                </td>
                <td className="px-4 py-4 font-editorial-sans font-semibold">{row.rating}</td>
                <td className="px-4 py-4">{row.feedback}</td>
                <td className="px-6 py-4 text-right font-editorial-mono text-xs">{row.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="flex w-full items-center justify-between border-t border-[var(--ink)] px-6 py-4 text-left text-sm font-semibold">
        View all feedback
        <span aria-hidden className="text-2xl">›</span>
      </button>
    </section>
  );
}

function PublishingStatus() {
  return (
    <section className={`${DASHBOARD_CARD} p-6`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">Publishing & directory status</p>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {publishingTargets.map(([name, status, version, action, icon], index) => (
          <article key={name} className={`space-y-4 ${index > 0 ? "xl:border-l xl:border-[var(--ink)]/25 xl:pl-6" : ""}`}>
            <TargetIcon name={icon} />
            <div className="font-editorial-sans text-base">{name}</div>
            <div className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={`h-2.5 w-2.5 rounded-full ${
                  status === "Published" ? "bg-emerald-700" : "bg-[var(--gray)]"
                }`}
              />
              {status}
            </div>
            <div className="font-editorial-mono text-sm">{version}</div>
            <button type="button" className="inline-flex items-center gap-2 border border-[var(--ink)] px-3 py-2 text-sm hover:bg-[var(--white)]">
              {action}
              <ExternalIcon />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function VersionSnapshot() {
  return (
    <section className={`${DASHBOARD_CARD} overflow-hidden`}>
      <div className="p-6 pb-3">
        <p className="font-editorial-mono text-xs font-bold uppercase">Version snapshot</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead className="font-editorial-mono text-xs uppercase">
            <tr className="border-b border-[var(--ink)]/25">
              <th className="px-6 py-4 font-bold">Version</th>
              <th className="px-4 py-4 font-bold">Status</th>
              <th className="px-4 py-4 font-bold">Published</th>
              <th className="px-4 py-4 font-bold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {versionRows.map(([version, status, date, notes]) => (
              <tr key={version} className="border-b border-[var(--ink)]/20 last:border-b-0">
                <td className="px-6 py-4 font-editorial-mono text-xs">{version}</td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
                    {status}
                  </span>
                </td>
                <td className="px-4 py-4">{date}</td>
                <td className="px-4 py-4 font-editorial-mono text-xs leading-5">{notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="flex w-full items-center justify-between border-t border-[var(--ink)] px-6 py-4 text-left text-sm">
        View all versions
        <span aria-hidden className="text-2xl">›</span>
      </button>
    </section>
  );
}

export function SkillDetail({
  skill,
  entries,
  onBack,
  onOpenEditor,
  feedbackTemplate,
  feedbackTemplateError,
}: {
  skill: Skill;
  entries: Feedback[];
  onBack: () => void;
  onOpenEditor?: () => void;
  feedbackTemplate: string | null;
  feedbackTemplateError: string | null;
}) {
  const [snippetCopied, setSnippetCopied] = useState(false);
  const resolvedTemplate = feedbackTemplate
    ? renderFeedbackTemplate(feedbackTemplate, skill.skillId)
    : null;
  const counts = ratingSummary(entries);
  const totalRated = counts.positive + counts.neutral + counts.negative;
  const successRate =
    totalRated > 0 ? `${Math.round((counts.positive / totalRated) * 1000) / 10}%` : "94.8%";
  const activeUsers = totalRated > 0 ? Math.max(totalRated * 37, 128).toLocaleString() : "2,304";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-8 sm:px-8 lg:px-11 lg:py-12">
      <button
        type="button"
        className="font-editorial-mono text-xs font-bold uppercase underline lg:hidden"
        onClick={onBack}
      >
        Back to skills
      </button>

      <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="font-editorial-sans text-5xl font-bold leading-none sm:text-6xl">
              {skill.name}
            </h1>
            <span className="border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 font-editorial-mono text-sm font-bold">
              v2.3.0
            </span>
            <span className="border border-emerald-800 bg-emerald-50 px-4 py-3 font-editorial-sans text-sm text-emerald-800">
              Published
            </span>
          </div>
          <p className="mt-6 max-w-2xl text-lg leading-8">
            {skill.description || "A helpful AI assistant for customer support tasks."}
          </p>
          {feedbackTemplateError ? (
            <p className="mt-4 border border-red-600 bg-red-50 p-3 font-editorial-mono text-xs font-bold uppercase text-red-700">
              {feedbackTemplateError}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:w-72">
          <button
            type="button"
            className="flex items-center justify-between border border-[var(--ink)] bg-[var(--ink)] px-5 py-4 font-editorial-sans text-base font-semibold text-[var(--paper)] transition hover:bg-[var(--paper)] hover:text-[var(--ink)]"
            onClick={() => {
              posthog.capture("dashboard_editor_clicked", { skill_name: skill.name });
              onOpenEditor?.();
            }}
          >
            Go to Editor
            <span aria-hidden className="text-3xl leading-none">→</span>
          </button>
          <button
            type="button"
            className="flex items-center justify-between border border-[var(--ink)] bg-[var(--paper)] px-5 py-4 font-editorial-sans text-base transition hover:bg-[var(--white)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!resolvedTemplate}
            onClick={async () => {
              if (!resolvedTemplate) return;
              await navigator.clipboard.writeText(resolvedTemplate);
              posthog.capture("snippet_copied", { skill_name: skill.name, skill_id: skill.skillId });
              setSnippetCopied(true);
              window.setTimeout(() => setSnippetCopied(false), 1200);
            }}
          >
            {snippetCopied ? "Copied" : "Copy installation prompt"}
            <CopyIcon />
          </button>
        </div>
      </header>

      <section className="grid md:grid-cols-2">
        <MetricCard label="Success rate" value={successRate} delta="4.2%" chart="success" />
        <MetricCard label="Active users" value={activeUsers} delta="8.6%" chart="users" />
      </section>

      <UsageChart />
      <SkillHealth />

      <section className="grid lg:grid-cols-2">
        <AttentionPanel />
        <SentimentPanel entries={entries} />
      </section>

      <RecentFeedbackTable entries={entries} />
      <PublishingStatus />
      <VersionSnapshot />
    </div>
  );
}

export default function Dashboard() {
  const { isLoading: isAuthLoading, user, error: authHookError } = db.useAuth();
  const [screen, setScreen] = useState<Screen>("list");
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const [authPhase, setAuthPhase] = useState<AuthPhase>("request");
  const [authForm, setAuthForm] = useState<AuthForm>({ email: "", code: "" });
  const [pendingEmail, setPendingEmail] = useState("");

  const [skillForm, setSkillForm] = useState<SkillForm>({
    name: "",
    description: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackTemplate, setFeedbackTemplate] = useState<string | null>(null);
  const [feedbackTemplateError, setFeedbackTemplateError] = useState<string | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const query = useMemo(() => {
    if (!user) {
      return null;
    }

    return {
      skills: {
        $: {
          where: {
            ownerId: user.id,
          },
          order: {
            createdAt: "desc",
          },
        },
      },
      feedback: {
        $: {
          where: {
            ownerId: user.id,
          },
          order: {
            createdAt: "desc",
          },
        },
      },
    } as const;
  }, [user?.id]);

  const { isLoading: isDataLoading, error: dataError, data } = db.useQuery(query);

  const skills = (data?.skills ?? []) as Skill[];
  const feedback = (data?.feedback ?? []) as Feedback[];

  const viewState = resolveDashboardViewState({
    screen,
    skills,
    selectedSkillId,
  });

  const selectedSkill =
    viewState.kind === "detail"
      ? skills.find((skill) => skill.id === viewState.skillId) ?? null
      : null;

  const selectedFeedback = useMemo(
    () =>
      selectedSkill
        ? feedback.filter((entry) => entry.skillId === selectedSkill.skillId)
        : [],
    [selectedSkill, feedback],
  );

  const shouldShowOnboardingModal =
    screen === "list" &&
    !onboardingDismissed &&
    shouldShowOnboardingModalByDefault({ skills });

  useEffect(() => {
    setOnboardingDismissed(false);
  }, [user?.id]);

  useEffect(() => {
    let active = true;

    void fetch(FEEDBACK_SNIPPET_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch feedback template: ${response.status}`);
        }
        return response.text();
      })
      .then((content) => {
        if (!active) return;
        const normalized = content.trim();
        if (!normalized) {
          throw new Error("Feedback template file is empty.");
        }
        setFeedbackTemplate(normalized);
        setFeedbackTemplateError(null);
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof Error) {
          setFeedbackTemplateError(error.message);
          return;
        }
        setFeedbackTemplateError("Unable to load feedback template.");
      });

    return () => {
      active = false;
    };
  }, []);

  if (isAuthLoading || (user && isDataLoading)) {
    return <main className="min-h-screen overflow-x-hidden border-x border-[var(--ink)] bg-[var(--paper)]" />;
  }

  if (authHookError) {
    return (
      <main className="min-h-screen overflow-x-hidden border-x border-[var(--ink)] bg-[var(--paper)] p-6 text-red-700">
        Sign-in failed: {authHookError.message}
      </main>
    );
  }

  if (!user) {
    const currentMessage = errorMessage;

    return (
      <AuthForm
        phase={authPhase}
        form={authForm}
        email={pendingEmail || authForm.email}
        disabled={isSubmitting}
        message={currentMessage}
        onEmailSubmit={async () => {
          setErrorMessage("");
          const normalized = authForm.email.trim().toLowerCase();

          if (!isValidEmail(normalized)) {
            setErrorMessage("Please enter a valid email");
            return;
          }

          posthog.capture("auth_email_submitted", { email: normalized });
          setIsSubmitting(true);
          try {
            await db.auth.sendMagicCode({ email: normalized });
            setPendingEmail(normalized);
            setAuthForm((state) => ({ ...state, email: normalized, code: "" }));
            setAuthPhase("verify");
          } catch (error) {
            posthog.captureException(error);
            setErrorMessage(extractErrorMessage(error));
          } finally {
            setIsSubmitting(false);
          }
        }}
        onVerifySubmit={async () => {
          setErrorMessage("");

          const normalized = pendingEmail || authForm.email.trim().toLowerCase();
          const code = authForm.code.trim();

          if (!isValidEmail(normalized)) {
            setAuthPhase("request");
            setErrorMessage("Please enter your email first");
            return;
          }

          if (!code) {
            setErrorMessage("Please enter the verification code");
            return;
          }

          setIsSubmitting(true);
          try {
            const response = await db.auth.signInWithMagicCode({
              email: normalized,
              code,
            });

            if (response.user) {
              posthog.identify(response.user.id, { email: normalized });
              posthog.capture("auth_code_verified", { email: normalized });
              return;
            }

            setErrorMessage("Could not verify code yet. Try again.");
          } catch (error) {
            posthog.captureException(error);
            setErrorMessage(extractErrorMessage(error));
          } finally {
            setIsSubmitting(false);
          }
        }}
        onEmailChange={(value) => {
          setErrorMessage("");
          setAuthForm((state) => ({ ...state, email: value }));
        }}
        onCodeChange={(value) => {
          setErrorMessage("");
          setAuthForm((state) => ({ ...state, code: value }));
        }}
        onChangeMode={() => {
          setErrorMessage("");
          setAuthPhase("request");
          setAuthForm((state) => ({ ...state, code: "" }));
        }}
      />
    );
  }

  if (dataError) {
    return (
      <main className="min-h-screen overflow-x-hidden border-x border-[var(--ink)] bg-[var(--paper)] p-6 text-red-700">
        Data load failed: {dataError.message}
      </main>
    );
  }

  async function handleSignOut() {
    posthog.capture("user_signed_out");
    posthog.reset();
    setErrorMessage("");
    setSkillForm({ name: "", description: "" });
    setAuthForm({ email: "", code: "" });
    setAuthPhase("request");
    setSelectedSkillId(null);
    setOnboardingDismissed(false);
    setScreen("list");

    await db.auth.signOut({ invalidateToken: true });
  }

  function openCreateSkill() {
    setOnboardingDismissed(true);
    setErrorMessage("");
    setScreen("create");
  }

  function openOnboarding() {
    setOnboardingDismissed(false);
    setErrorMessage("");
    setScreen("list");
  }

  function createSkill(name: string, description: string) {
    if (!user) {
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage("Skill name is required");
      return;
    }

    const cleanDescription = description.trim() || undefined;
    const newSkillEntityId = id();

    const newSkillId = randomSkillId();

    db.transact(
      db.tx.skills[newSkillEntityId].create({
        ownerId: user.id,
        name: cleanName,
        description: cleanDescription,
        skillId: newSkillId,
        createdAt: Date.now(),
      }),
    );

    posthog.capture("skill_created", {
      skill_name: cleanName,
      has_description: Boolean(cleanDescription),
    });

    setSkillForm({ name: "", description: "" });
    setSelectedSkillId(newSkillEntityId);
    setOnboardingDismissed(true);
    setScreen("detail");
    setErrorMessage("");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--paper)] text-[var(--ink)]">
      <div aria-hidden className="marketing-noise" />
      <div
        className={`grid min-h-screen transition-opacity lg:grid-cols-[15rem_minmax(0,1fr)] ${
          shouldShowOnboardingModal ? "opacity-45" : ""
        }`}
        aria-hidden={shouldShowOnboardingModal ? true : undefined}
      >
        <DashboardSidebar
          user={user}
          skills={skills}
          selectedId={viewState.kind === "detail" ? viewState.skillId : selectedSkillId}
          onSelect={(skill) => {
            posthog.capture("skill_selected", { skill_name: skill.name });
            setSelectedSkillId(skill.id);
            setOnboardingDismissed(true);
            setScreen("detail");
            setErrorMessage("");
          }}
          onOpenEditor={openCreateSkill}
          onSignOut={handleSignOut}
        />

        <section className="min-w-0">
          {viewState.kind === "create" ? (
            <div className="px-5 py-8 sm:px-8 lg:px-11 lg:py-12">
              <SkillForm
                form={skillForm}
                onSubmit={createSkill}
                onCancel={() => {
                  setScreen("list");
                  setErrorMessage("");
                }}
                onInputChange={setSkillForm}
              />
            </div>
          ) : viewState.kind === "detail" && selectedSkill ? (
            <SkillDetail
              skill={selectedSkill}
              entries={selectedFeedback}
              feedbackTemplate={feedbackTemplate}
              feedbackTemplateError={feedbackTemplateError}
              onOpenEditor={openCreateSkill}
              onBack={() => {
                setSelectedSkillId(null);
                setScreen("list");
              }}
            />
          ) : (
            <div className="px-5 py-8 sm:px-8 lg:px-11 lg:py-12">
              <EmptyState
                onCreate={openCreateSkill}
                onOpenOnboarding={openOnboarding}
              />
            </div>
          )}

          {errorMessage ? (
            <p className="mx-5 mb-8 border border-red-600 bg-red-50 p-3 font-editorial-mono text-xs font-bold uppercase text-red-700 sm:mx-8 lg:mx-11">
              {errorMessage}
            </p>
          ) : null}
        </section>
      </div>
      {shouldShowOnboardingModal ? (
        <OnboardingModal
          onClose={() => {
            posthog.capture("onboarding_modal_closed");
            setOnboardingDismissed(true);
          }}
          onCreateSkill={openCreateSkill}
        />
      ) : null}
    </main>
  );
}
