"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
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
type DashboardTab = "overview" | "editor" | "analytics" | "settings" | "account";
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

const editorMarkdownFiles = ["SKILL.md", "README.md", "examples.md", "changelog.md"] as const;
const editorAssets = ["assets/logo.png", "faq.pdf"] as const;
const editorValidationRows = [
  ["Skill standard passed", ""],
  ["Required fields complete", ""],
  ["Markdown files", "4"],
  ["Read-only assets", "2"],
] satisfies Array<[string, string]>;
const editorVersionHistoryRows = [
  ["v2.4.0", "Draft", "bg-[var(--ink)]"],
  ["v2.3.0", "Published", "bg-emerald-700"],
  ["v2.2.0", "Published", "bg-emerald-700"],
  ["v2.1.0", "Published", "bg-emerald-700"],
] satisfies Array<[string, string, string]>;
const editorPublishingRows = [
  ["skills.sh", "Ready", "-", "terminal", "bg-emerald-700"],
  ["GitHub", "Sync on publish", "-", "github", "bg-[var(--gray)]"],
  ["agentskills.io", "Sync on publish", "-", "circle", "bg-[var(--gray)]"],
] satisfies Array<[string, string, string, string, string]>;
const analyticsFeedbackRows = [
  ["May 12, 2025 23:41", "positive", "Claude", "Answered the billing question clearly and linked the correct help article."],
  ["May 12, 2025 22:18", "neutral", "Cursor", "Useful overall, but the refund edge case was not covered in the skill."],
  ["May 12, 2025 21:07", "negative", "Goose", "Escalation guidance was missing when the user asked about account access."],
  ["May 12, 2025 19:56", "positive", "Codex", "Response was concise and easy to reuse."],
  ["May 12, 2025 18:32", "neutral", "Agent run", "The plan change example helped, but pricing details were slightly outdated."],
  ["May 12, 2025 17:15", "positive", "Claude", "Handled the question well and cited a trusted source."],
  ["May 12, 2025 15:42", "negative", "Cursor", "Good tone, but the workflow should mention when to stop and ask for clarification."],
  ["May 12, 2025 14:08", "neutral", "Goose", "Information was mostly correct, but the refund policy ambiguity is still confusing."],
] satisfies Array<[string, RecentFeedbackRow["sentiment"], string, string]>;

const skillSelectorFallbackSkills = [
  ["demo-skill", "Customer support workflow"],
  ["seo-audit", "Growth and content review"],
  ["customer-support", "Support response assistant"],
] satisfies Array<[string, string]>;

const skillSettingsPublishingRows = [
  ["skills.sh", "Publish on release", "Enabled", "terminal", "bg-emerald-700"],
  ["GitHub", "Create PR on publish", "Enabled", "github", "bg-emerald-700"],
  ["agentskills.io", "Publish on release", "Enabled", "circle", "bg-emerald-700"],
  ["Skillfully directory", "Coming soon", "Disabled", "square", "bg-[var(--gray)]"],
] satisfies Array<[string, string, string, string, string]>;

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

function displayAccountName(user: AppUser | null | undefined) {
  const email = user?.email;
  if (!email) {
    return "Jane Developer";
  }

  const handle = email.split("@")[0] || "Jane";
  if (handle.toLowerCase() === "jane") {
    return "Jane Developer";
  }

  return handle
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Jane Developer";
}

function skillInitials(name: string) {
  const parts = name.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
    : `${name[0] ?? "S"}${name[1] ?? "K"}`;

  return initials.toUpperCase();
}

function slugifySkillName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "demo-skill";
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

export function SkillSelector({
  skills,
  selectedId,
  isOpen,
  onToggle,
  onSelect,
  onCreateSkill,
}: {
  skills: Skill[];
  selectedId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (skill: Skill) => void;
  onCreateSkill: () => void;
}) {
  const skillOptions = [
    ...skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description || "Skillfully skill",
      skill,
    })),
    ...skillSelectorFallbackSkills
      .filter(([name]) => !skills.some((skill) => skill.name.toLowerCase() === name.toLowerCase()))
      .map(([name, description]) => ({
        id: `preview-${name}`,
        name,
        description,
        skill: null,
      })),
  ];
  const selectedOption =
    skillOptions.find((option) => option.id === selectedId) ?? skillOptions[0] ?? null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-left font-editorial-mono text-sm transition hover:bg-[var(--white)]"
        onClick={onToggle}
      >
        <span className="truncate">{selectedOption?.name ?? "No skills yet"}</span>
        <span aria-hidden className="text-xl leading-none">{isOpen ? "⌃" : "⌄"}</span>
      </button>

      {isOpen ? (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.45rem)] z-30 w-72 border border-[var(--ink)] bg-[var(--white)] p-2 shadow-[6px_6px_0_var(--ink)]"
        >
          <div className="space-y-1">
            {skillOptions.map((option) => {
              const isSelected =
                option.id === selectedId ||
                (!selectedId && option.id === selectedOption?.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className="grid w-full grid-cols-[2.25rem_1fr_auto] items-center gap-3 px-2 py-2 text-left text-sm hover:bg-[var(--paper)]"
                  onClick={() => {
                    if (option.skill) {
                      onSelect(option.skill);
                    }
                  }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ink)] font-editorial-mono text-xs font-bold text-[var(--paper)]">
                    {skillInitials(option.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-editorial-mono">{option.name}</span>
                    <span className="block truncate text-xs text-[var(--ink)]/55">{option.description}</span>
                  </span>
                  {isSelected ? <span aria-hidden className="text-lg leading-none">✓</span> : null}
                </button>
              );
            })}
          </div>
          <div className="mt-2 border-t border-[var(--ink)] pt-2">
            <button
              type="button"
              className="flex w-full items-center gap-3 bg-[var(--paper)] px-3 py-3 text-left font-editorial-mono text-sm hover:bg-[var(--white)]"
              onClick={onCreateSkill}
            >
              <span aria-hidden className="text-2xl leading-none">+</span>
              Create new skill
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CreateSkillModal({
  form,
  onChange,
  onCancel,
  onSubmit,
}: {
  form: SkillForm;
  onChange: (value: SkillForm) => void;
  onCancel: () => void;
  onSubmit: (name: string, description: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/35 px-5 py-8 backdrop-blur-[1px]">
      <section className="w-full max-w-xl border-2 border-[var(--ink)] bg-[var(--white)] p-7 shadow-[8px_8px_0_var(--ink)] sm:p-9">
        <h2 className="font-editorial-sans text-3xl font-bold">Create new skill</h2>
        <p className="mt-3 font-editorial-mono text-sm">Start a new skill in Skillfully.</p>

        <form
          className="mt-7 space-y-6"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            onSubmit(form.name.trim(), form.description.trim());
          }}
        >
          <label className="block font-editorial-mono text-xs font-bold uppercase">
            Skill name
            <input
              value={form.name}
              className={`${DASHBOARD_INPUT} bg-[var(--paper)]`}
              onChange={(event) => onChange({ ...form, name: event.currentTarget.value })}
              name="name"
              placeholder="e.g. billing-support"
              required
            />
          </label>

          <label className="block font-editorial-mono text-xs font-bold uppercase">
            Description (optional)
            <textarea
              value={form.description}
              className={`${DASHBOARD_INPUT} min-h-32 bg-[var(--paper)]`}
              onChange={(event) => onChange({ ...form, description: event.currentTarget.value })}
              name="description"
              placeholder="What does this skill do?"
            />
          </label>

          <p className="font-editorial-mono text-sm">
            Need an existing repo instead?{" "}
            <button type="button" className="font-bold underline">
              Import from GitHub
            </button>
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className={DASHBOARD_BUTTON_LIGHT} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={DASHBOARD_BUTTON}>
              Create skill
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DashboardSidebar({
  user,
  skills,
  selectedId,
  activeTab,
  isSkillSelectorOpen,
  onSelect,
  onTabChange,
  onToggleSkillSelector,
  onOpenCreateSkill,
  onSignOut,
}: {
  user: AppUser;
  skills: Skill[];
  selectedId: string | null;
  activeTab: DashboardTab;
  isSkillSelectorOpen: boolean;
  onSelect: (skill: Skill) => void;
  onTabChange: (tab: DashboardTab) => void;
  onToggleSkillSelector: () => void;
  onOpenCreateSkill: () => void;
  onSignOut: () => void;
}) {
  const navItems = [
    ["overview", "Overview"],
    ["editor", "Editor"],
    ["analytics", "Analytics"],
    ["settings", "Settings"],
  ] satisfies Array<[DashboardTab, string]>;

  return (
    <aside className="flex min-h-0 flex-col border-b border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] lg:sticky lg:top-0 lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r">
      <div className="border-b border-[var(--ink)] px-5 py-6">
        <BrandMark />
      </div>

      <div className="px-5 py-7">
        <p className="mb-3 font-editorial-mono text-xs font-bold uppercase">Skill</p>
        <SkillSelector
          skills={skills}
          selectedId={selectedId}
          isOpen={isSkillSelectorOpen}
          onToggle={onToggleSkillSelector}
          onSelect={onSelect}
          onCreateSkill={onOpenCreateSkill}
        />
      </div>

      <nav className="border-y border-[var(--ink)] font-editorial-sans text-sm">
        {navItems.map(([tab, label]) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              className={`flex w-full items-center gap-3 border-l-4 px-5 py-4 text-left ${
                isActive
                  ? "border-[var(--ink)] bg-[var(--ink)] font-semibold text-[var(--paper)]"
                  : "border-transparent hover:bg-[var(--white)]"
              }`}
              onClick={() => onTabChange(tab)}
            >
              <DashboardIcon name={tab} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-5 px-5 py-6">
        <button
          type="button"
          className="flex w-full items-center gap-3 border border-[var(--ink)] px-4 py-3 text-left font-editorial-mono text-sm hover:bg-[var(--white)]"
          onClick={onOpenCreateSkill}
        >
          <span aria-hidden className="text-2xl leading-none">+</span>
          New Skill
        </button>

        <div className="border border-[var(--ink)] p-4">
          <p className="font-editorial-mono text-xs font-bold uppercase">Need help?</p>
          <p className="mt-3 text-sm leading-6">
            Read the guide to learn how to build great agent skills.
          </p>
          <button type="button" className="mt-5 font-editorial-mono text-xs font-bold uppercase underline">
            Open Guide <span aria-hidden>→</span>
          </button>
        </div>

        <button
          type="button"
          className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm ${
            activeTab === "account"
              ? "bg-[var(--ink)] font-semibold text-[var(--paper)]"
              : "border border-[var(--ink)] hover:bg-[var(--white)]"
          }`}
          onClick={() => onTabChange("account")}
        >
          <DashboardIcon name="account" />
          Account Settings
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

function sentimentLabel(sentiment: RecentFeedbackRow["sentiment"]) {
  return sentiment[0].toUpperCase() + sentiment.slice(1);
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

function CheckCircleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
      <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm3.8 6.5-4.5 4.6-2.4-2.4 1-1 1.4 1.4 3.5-3.6 1 1Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13 13 4 4" />
    </svg>
  );
}

function FileGlyph({ locked = false }: { locked?: boolean }) {
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

function WorkspaceTopBar({ current }: { current: "Frontmatter" | "Analytics" }) {
  return (
    <div className="flex min-h-14 flex-col gap-3 border-b border-[var(--ink)] bg-[var(--paper)] px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-3">
        <button type="button" className="flex min-w-28 items-center justify-between border border-[var(--ink)] px-4 py-2 text-sm">
          Files
          <span aria-hidden className="text-xl leading-none">›</span>
        </button>
        <button type="button" className="flex min-w-32 items-center justify-between border border-[var(--ink)] px-4 py-2 text-sm">
          {current}
          <span aria-hidden className="text-xl leading-none">›</span>
        </button>
      </div>
      <button type="button" className="flex items-center gap-3 self-start text-sm lg:self-auto">
        <CheckCircleIcon />
        Validate skill
      </button>
    </div>
  );
}

function SkillEditorWorkspace({
  skill,
}: {
  skill: Skill;
}) {
  const [selectedFile, setSelectedFile] = useState<(typeof editorMarkdownFiles)[number]>("SKILL.md");
  const [frontmatter, setFrontmatter] = useState({
    name: skill.name,
    summary: skill.description || "Helps agents answer customer support questions clearly and safely.",
    version: "v2.4.0",
    status: "Draft",
  });
  const installPrompt = [
    `Install and use the ${skill.name} skill.`,
    "Load the latest published version from Skillfully, skills.sh, or agentskills.io.",
    "Use it as a guide for handling customer support questions.",
    "Follow its workflow, response style, and escalation guidance.",
  ].join("\n");

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <WorkspaceTopBar current="Frontmatter" />

      <section className="grid border-b border-[var(--ink)] xl:min-h-[47rem] xl:grid-cols-[17.5rem_minmax(0,1fr)_21.5rem]">
        <aside className="border-b border-[var(--ink)] p-5 xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between">
            <p className="font-editorial-mono text-xs font-bold uppercase">Files</p>
            <button type="button" aria-label="Collapse files" className="text-2xl leading-none">‹</button>
          </div>
          <button type="button" className="mt-7 flex w-full items-center justify-center gap-3 border border-[var(--ink)] px-4 py-3 text-sm">
            <span className="text-2xl leading-none">+</span>
            Upload file
          </button>

          <div className="mt-7">
            <p className="font-editorial-mono text-xs font-bold uppercase">Markdown files (editable)</p>
            <div className="mt-4 space-y-2">
              {editorMarkdownFiles.map((file) => {
                const isActive = selectedFile === file;
                return (
                  <button
                    key={file}
                    type="button"
                    className={`flex w-full items-center justify-between px-3 py-3 text-left text-sm ${
                      isActive ? "bg-[var(--white)] font-semibold" : "hover:bg-[var(--white)]"
                    }`}
                    onClick={() => setSelectedFile(file)}
                  >
                    <span className="flex items-center gap-3">
                      <FileGlyph />
                      {file}
                    </span>
                    {isActive ? <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--ink)]" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 border-t border-[var(--ink)] pt-7">
            <p className="font-editorial-mono text-xs font-bold uppercase">Assets (read-only)</p>
            <div className="mt-4 space-y-2">
              {editorAssets.map((asset) => (
                <div key={asset} className="flex items-center justify-between px-3 py-3 text-sm">
                  <span className="flex items-center gap-3">
                    <FileGlyph locked />
                    {asset}
                  </span>
                  <FileGlyph locked />
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 border-b border-[var(--ink)] bg-[var(--white)] xl:border-b-0 xl:border-r">
          <div className="flex min-h-14 items-center gap-3 overflow-x-auto border-b border-[var(--ink)] px-5 text-sm">
            {["↶", "↷", "B", "I", "Link", "•", "1.", "H2", "\"", "</>", "Table", "..."].map((tool, index) => (
              <button
                key={`${tool}-${index}`}
                type="button"
                className={`shrink-0 px-2 py-1 ${tool === "H2" ? "border border-[var(--ink)] px-4" : ""}`}
              >
                {tool}
              </button>
            ))}
          </div>
          <article className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
            <h1 className="font-editorial-sans text-5xl font-bold leading-none sm:text-6xl">{frontmatter.name}</h1>
            <p className="mt-4 text-lg leading-8">{frontmatter.summary}</p>
            <blockquote className="mt-6 border-l-4 border-[var(--ink)] bg-[var(--paper)] px-5 py-4 italic leading-7">
              Be concise, cite sources, and escalate when the answer is unknown or sensitive to protect the customer and the company.
            </blockquote>

            <h2 className="mt-8 font-editorial-sans text-3xl font-bold">When to use</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-6">
              <li>Answer questions about product features and how they work</li>
              <li>Help customers understand pricing, plans, and promotions</li>
              <li>Clarify billing, payments, refunds, and account issues</li>
              <li>Explain company policies, eligibility, and terms</li>
            </ul>

            <h2 className="mt-8 font-editorial-sans text-3xl font-bold">Workflow</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm leading-6">
              <li>Understand the customer's question and context</li>
              <li>Search trusted sources and gather relevant information</li>
              <li>Draft a clear, concise answer with sources</li>
              <li>Confirm accuracy and compliance</li>
              <li>Escalate when unsure or request more information</li>
            </ol>

            <h2 className="mt-8 font-editorial-sans text-3xl font-bold">Response style</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-6">
              <li>Use short, plain language</li>
              <li>Lead with the answer, then add helpful details</li>
              <li>Cite sources using inline links</li>
              <li>Stay empathetic and professional</li>
            </ul>

            <h2 className="mt-8 font-editorial-sans text-3xl font-bold">Examples</h2>
            <div className="mt-4 space-y-3 text-sm leading-6">
              <p><span className="mr-3 rounded-full border border-[var(--ink)] px-2 py-1 font-editorial-mono text-xs">Q</span>Can I change my plan after I've subscribed?</p>
              <p className="pl-11"><span className="mr-3 rounded-full border border-[var(--ink)] px-2 py-1 font-editorial-mono text-xs">A</span>Yes. You can change your plan at any time from your billing settings. The changes take effect at the start of your next billing cycle.</p>
            </div>
          </article>
        </section>

        <aside className="p-5">
          <div className="flex items-center justify-between">
            <p className="font-editorial-mono text-xs font-bold uppercase">Frontmatter</p>
            <button type="button" aria-label="Collapse frontmatter" className="text-2xl leading-none">⌃</button>
          </div>

          <div className="mt-6 space-y-5">
            <label className="block text-sm">
              <span className="block font-editorial-sans">Name</span>
              <input
                className={DASHBOARD_INPUT}
                value={frontmatter.name}
                onChange={(event) => {
                  const nextName = event.currentTarget.value;
                  setFrontmatter((state) => ({ ...state, name: nextName }));
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="block font-editorial-sans">Summary</span>
              <textarea
                className={`${DASHBOARD_INPUT} min-h-24`}
                value={frontmatter.summary}
                onChange={(event) => {
                  const nextSummary = event.currentTarget.value;
                  setFrontmatter((state) => ({ ...state, summary: nextSummary }));
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="block font-editorial-sans">Version</span>
              <input
                className={DASHBOARD_INPUT}
                value={frontmatter.version}
                onChange={(event) => {
                  const nextVersion = event.currentTarget.value;
                  setFrontmatter((state) => ({ ...state, version: nextVersion }));
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="block font-editorial-sans">Status</span>
              <select
                className={DASHBOARD_INPUT}
                value={frontmatter.status}
                onChange={(event) => {
                  const nextStatus = event.currentTarget.value;
                  setFrontmatter((state) => ({ ...state, status: nextStatus }));
                }}
              >
                <option>Draft</option>
                <option>Published</option>
              </select>
            </label>
          </div>

          <div className="mt-7 border-t border-[var(--ink)] pt-6">
            <p className="font-editorial-mono text-xs font-bold uppercase">Validation</p>
            <div className="mt-4 space-y-4">
              {editorValidationRows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-3">
                    <span className="text-emerald-700"><CheckCircleIcon /></span>
                    {label}
                  </span>
                  {value ? <span>{value}</span> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 border-t border-[var(--ink)] pt-6">
            <p className="font-editorial-mono text-xs font-bold uppercase">Version history</p>
            <div className="mt-4 space-y-4">
              {editorVersionHistoryRows.map(([version, status, dot]) => (
                <div key={version} className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 text-sm">
                  <span>{version}</span>
                  <span className="italic">{status}</span>
                  <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="grid border-b border-[var(--ink)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="border-b border-[var(--ink)] p-5 lg:border-b-0 lg:border-r">
          <p className="font-editorial-mono text-xs font-bold uppercase">Publishing destinations</p>
          <table className="mt-4 w-full border-collapse text-left text-sm">
            <thead className="font-editorial-mono text-xs uppercase">
              <tr className="border-b border-[var(--ink)]">
                <th className="py-3 font-bold">Destination</th>
                <th className="py-3 font-bold">Status</th>
                <th className="py-3 text-right font-bold">Last sync</th>
              </tr>
            </thead>
            <tbody>
              {editorPublishingRows.map(([destination, status, sync, icon, dot]) => (
                <tr key={destination} className="border-b border-[var(--ink)]/50">
                  <td className="py-3">
                    <span className="flex items-center gap-3">
                      <TargetIcon name={icon} />
                      {destination}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="flex items-center gap-3">
                      <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />
                      {status}
                    </span>
                  </td>
                  <td className="py-3 text-right">{sync}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-5">
          <button type="button" className="w-full border border-[var(--ink)] bg-[var(--ink)] px-6 py-4 font-editorial-sans text-lg font-semibold text-[var(--paper)]">
            Publish version
          </button>
          <div className="mt-4 border border-[var(--ink)] p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="font-editorial-mono text-xs font-bold uppercase">Install skill prompt</p>
              <button type="button" aria-label="Copy install skill prompt" className="border border-[var(--ink)] p-3">
                <CopyIcon />
              </button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap font-editorial-mono text-xs leading-6">
              {installPrompt}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

function AnalyticsChart({
  title,
  value,
  delta,
  yLabels,
  path,
}: {
  title: string;
  value: string;
  delta: string;
  yLabels: string[];
  path: string;
}) {
  return (
    <article className={`${DASHBOARD_CARD} p-5`}>
      <div className="flex items-start gap-2">
        <h2 className="font-editorial-sans text-2xl font-semibold">{title}</h2>
        <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--ink)] font-editorial-mono text-xs">i</span>
      </div>
      <div className="mt-3 flex items-center gap-5">
        <span className="font-editorial-sans text-3xl font-semibold">{value}</span>
        <span className="font-editorial-sans text-sm">
          <span className="font-bold text-emerald-700">▲</span> {delta}
        </span>
      </div>
      <div className="mt-6 overflow-x-auto">
        <svg aria-label={`${title} chart`} role="img" viewBox="0 0 560 255" className="h-64 min-w-[34rem] text-[var(--ink)]">
          {[34, 84, 134, 184, 234].map((y, index) => (
            <g key={y}>
              <line x1="58" y1={y} x2="540" y2={y} stroke="currentColor" strokeOpacity="0.22" strokeDasharray="4 4" />
              <text x="12" y={y + 5} className="fill-current font-editorial-sans text-xs">{yLabels[index]}</text>
            </g>
          ))}
          <line x1="58" y1="234" x2="540" y2="234" stroke="currentColor" />
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2.2" />
          {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"].map((label, index) => (
            <text key={label} x={58 + index * 80} y="252" className="fill-current font-editorial-sans text-xs">
              {label}
            </text>
          ))}
        </svg>
      </div>
    </article>
  );
}

function SkillAnalyticsWorkspace() {
  const [query, setQuery] = useState("");
  const [sentiments, setSentiments] = useState<Array<RecentFeedbackRow["sentiment"]>>([
    "positive",
    "neutral",
    "negative",
  ]);
  const visibleRows = analyticsFeedbackRows.filter(([, sentiment, source, feedback]) => {
    const matchesSentiment = sentiments.includes(sentiment);
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return matchesSentiment;
    }
    return matchesSentiment && `${source} ${feedback}`.toLowerCase().includes(needle);
  });

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <WorkspaceTopBar current="Analytics" />

      <section className="space-y-6 p-5 sm:p-7">
        <div className="grid gap-4 xl:grid-cols-[12rem_minmax(16rem,1fr)_10rem_minmax(20rem,auto)]">
          <select aria-label="Published version" className="border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-base" defaultValue="v2.3.0">
            <option value="v2.3.0">Published v2.3.0</option>
            <option value="v2.2.0">Published v2.2.0</option>
          </select>
          <label className="flex items-center gap-3 border border-[var(--ink)] bg-[var(--paper)] px-4">
            <SearchIcon />
            <input
              className="w-full bg-transparent py-3 outline-none"
              placeholder="Search feedback"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </label>
          <select aria-label="Analytics date range" className="border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-base" defaultValue="24h">
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
          </select>
          <div className="flex flex-wrap gap-2 border border-[var(--ink)] p-2">
            {(["positive", "neutral", "negative"] as const).map((sentiment) => {
              const isActive = sentiments.includes(sentiment);
              return (
                <button
                  key={sentiment}
                  type="button"
                  className={`border px-4 py-2 text-sm ${
                    isActive ? "border-[var(--ink)] bg-[var(--white)]" : "border-[var(--ink)]/30 opacity-55"
                  }`}
                  onClick={() =>
                    setSentiments((current) =>
                      current.includes(sentiment)
                        ? current.filter((item) => item !== sentiment)
                        : [...current, sentiment],
                    )
                  }
                >
                  {sentimentLabel(sentiment)}
                  <span className="ml-3" aria-hidden>×</span>
                </button>
              );
            })}
            <button type="button" aria-label="More filters" className="border border-[var(--ink)] px-3 py-2">⌄</button>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-2">
          <AnalyticsChart
            title="Active users"
            value="1,842"
            delta="18.6% vs prior 24h"
            yLabels={["2.0K", "1.5K", "1.0K", "500", "0"]}
            path="M62 158 82 154 102 166 122 174 142 162 162 156 182 166 202 150 222 138 242 132 262 120 282 96 302 88 322 78 342 68 362 64 382 58 402 56 422 50 442 44 462 38 482 34 502 28 522 20 540 24"
          />
          <AnalyticsChart
            title="Success rate"
            value="92%"
            delta="3.4 pp vs prior 24h"
            yLabels={["100%", "96%", "92%", "88%", "80%"]}
            path="M62 156 82 148 102 162 122 172 142 164 162 180 182 154 202 142 222 132 242 136 262 148 282 154 302 146 322 136 342 124 362 112 382 104 402 100 422 102 442 98 462 90 482 94 502 104 522 112 540 106"
          />
        </section>

        <section className={`${DASHBOARD_CARD} overflow-hidden`}>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-editorial-sans text-2xl font-semibold">Feedback</h2>
            <div className="flex gap-3">
              <label className="flex min-w-64 items-center gap-3 border border-[var(--ink)] px-4">
                <SearchIcon />
                <input
                  className="w-full bg-transparent py-3 outline-none"
                  placeholder="Search feedback"
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                />
              </label>
              <button type="button" aria-label="Tune filters" className="border border-[var(--ink)] px-4">☷</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
              <thead className="font-editorial-mono text-xs uppercase">
                <tr className="border-b border-[var(--ink)]">
                  <th className="px-5 py-4 font-bold">Time (UTC) ↓</th>
                  <th className="px-5 py-4 font-bold">Sentiment</th>
                  <th className="px-5 py-4 font-bold">Agent / Source</th>
                  <th className="px-5 py-4 font-bold">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(([time, sentiment, source, feedback]) => (
                  <tr key={`${time}-${source}`} className="border-b border-[var(--ink)]/45">
                    <td className="px-5 py-4">{time}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-3">
                        <span
                          aria-hidden
                          className={`h-2.5 w-2.5 rounded-full ${
                            sentiment === "positive"
                              ? "bg-emerald-700"
                              : sentiment === "negative"
                                ? "bg-red-600"
                                : "bg-[var(--gray)]"
                          }`}
                        />
                        {sentimentLabel(sentiment)}
                      </span>
                    </td>
                    <td className="px-5 py-4">{source}</td>
                    <td className="px-5 py-4">{feedback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-4 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>Showing 1-8 of 243</p>
            <div className="flex items-center gap-5">
              <button type="button" className="border border-[var(--ink)] px-3 py-2">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <span>...</span>
              <button type="button">31</button>
              <button type="button" className="text-2xl leading-none">›</button>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={`${DASHBOARD_CARD} overflow-hidden`}>
      <div className="border-b border-[var(--ink)] px-5 py-4 font-editorial-mono text-xs font-bold uppercase">
        {title}
      </div>
      {children}
    </section>
  );
}

function SettingsRow({
  label,
  value,
  action,
}: {
  label: string;
  value?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid gap-3 border-b border-[var(--ink)]/35 px-5 py-4 last:border-b-0 sm:grid-cols-[16rem_1fr_auto] sm:items-center">
      <span className="font-editorial-sans text-sm">{label}</span>
      <span className="min-w-0 font-editorial-sans text-sm">{value}</span>
      {action ? <span className="justify-self-start sm:justify-self-end">{action}</span> : null}
    </div>
  );
}

function TogglePill({ label = "Enabled" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--ink)] bg-[var(--paper)] px-3 py-1 font-editorial-sans text-xs">
      <span aria-hidden className="h-3 w-3 rounded-full bg-[var(--ink)]" />
      {label}
    </span>
  );
}

function AccountTopBar({
  user,
  isAccountMenuOpen,
  onToggleAccountMenu,
  onOpenAccountSettings,
  onSignOut,
}: {
  user: AppUser;
  isAccountMenuOpen: boolean;
  onToggleAccountMenu: () => void;
  onOpenAccountSettings: () => void;
  onSignOut: () => void;
}) {
  const accountName = displayAccountName(user);
  const accountEmail = user.email || "jane@acme.dev";

  return (
    <div className="relative flex min-h-16 items-center justify-end gap-5 border-b border-[var(--ink)] bg-[var(--paper)] px-5">
      <button type="button" className="font-editorial-mono text-sm underline">
        Guide
      </button>
      <button type="button" aria-label="Theme" className="text-2xl leading-none">
        ☼
      </button>
      <span aria-hidden className="h-9 border-l border-[var(--ink)]/40" />
      <button
        type="button"
        className="flex items-center gap-3"
        aria-haspopup="menu"
        aria-expanded={isAccountMenuOpen}
        onClick={onToggleAccountMenu}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ink)] font-editorial-mono text-sm font-bold text-[var(--paper)]">
          {skillInitials(accountName)}
        </span>
        <span aria-hidden className="font-editorial-mono text-sm">{isAccountMenuOpen ? "⌃" : "⌄"}</span>
      </button>

      {isAccountMenuOpen ? (
        <div className="absolute right-5 top-[calc(100%+0.45rem)] z-30 w-64 border border-[var(--ink)] bg-[var(--white)] p-4 shadow-[6px_6px_0_var(--ink)]">
          <p className="font-editorial-mono text-sm">{accountEmail}</p>
          <div className="mt-4 border-t border-[var(--ink)] pt-3">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-2 py-3 text-left text-sm hover:bg-[var(--paper)]"
              onClick={onOpenAccountSettings}
            >
              <DashboardIcon name="account" />
              Account settings
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-2 py-3 text-left text-sm hover:bg-[var(--paper)]"
            >
              <StatusIcon name="check" />
              Product guide
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-2 py-3 text-left text-sm hover:bg-[var(--paper)]"
              onClick={onSignOut}
            >
              <StatusIcon name="x" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SkillSettingsWorkspace({ skill }: { skill: Skill }) {
  const slug = slugifySkillName(skill.name);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-5 py-8 sm:px-8 lg:px-11 lg:py-12">
      <header>
        <h1 className="font-editorial-sans text-5xl font-bold leading-none sm:text-6xl">
          Settings
        </h1>
        <p className="mt-3 text-lg leading-7">Persistent configuration for this skill.</p>
      </header>

      <SettingsSection title="01. General">
        <SettingsRow label="Skill name" value={skill.name} />
        <SettingsRow label="Slug" value={slug} />
        <SettingsRow
          label="Archive skill"
          action={<button type="button" className={DASHBOARD_BUTTON_LIGHT}>Archive</button>}
        />
      </SettingsSection>

      <SettingsSection title="02. Source">
        <div className="grid gap-3 border-b border-[var(--ink)]/35 p-5 sm:grid-cols-2">
          <button type="button" className="flex items-center gap-3 border border-[var(--ink)]/45 px-4 py-4 text-left text-sm">
            <span aria-hidden className="h-5 w-5 rounded-full border border-[var(--ink)]" />
            Managed in Skillfully
          </button>
          <button type="button" className="flex items-center gap-3 border border-[var(--ink)] bg-[var(--white)] px-4 py-4 text-left text-sm">
            <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--ink)]">
              <span className="h-2 w-2 rounded-full bg-[var(--ink)]" />
            </span>
            GitHub tracked
          </button>
        </div>
        <SettingsRow label="Repository" value={`erensunerr/${slug}`} />
        <SettingsRow label="Default branch" value="main" />
        <SettingsRow label="Publish behavior" value="Create pull request on publish" />
        <SettingsRow
          label="Connection status"
          value={<span className="inline-flex items-center gap-3"><span aria-hidden className="h-2 w-2 rounded-full bg-[var(--ink)]" />Connected</span>}
        />
        <div className="space-y-4 p-5">
          <button type="button" className={DASHBOARD_BUTTON_LIGHT}>Disconnect GitHub</button>
          <p className="text-sm leading-6 text-[var(--ink)]/65">
            Switching to "Managed in Skillfully" keeps Skillfully as the canonical source without GitHub tracking.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title="03. Publishing">
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
            <thead className="font-editorial-mono text-xs uppercase">
              <tr className="border-b border-[var(--ink)]">
                <th className="py-3 font-bold">Destination</th>
                <th className="py-3 font-bold">Default behavior</th>
                <th className="py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {skillSettingsPublishingRows.map(([destination, behavior, status, icon, dot]) => (
                <tr key={destination} className="border-b border-[var(--ink)]/50 last:border-b-0">
                  <td className="py-3">
                    <span className="flex items-center gap-3">
                      <TargetIcon name={icon} />
                      {destination}
                    </span>
                  </td>
                  <td className="py-3">{behavior}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-3">
                      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                      {status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm leading-6 text-[var(--ink)]/65">
            Skillfully is the canonical source and syncs outward when you publish.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title="04. Tracking">
        <SettingsRow label="Install tracking" action={<TogglePill />} />
        <SettingsRow label="Invocation tracking" action={<TogglePill />} />
        <SettingsRow label="Feedback collection" action={<TogglePill />} />
        <SettingsRow
          label="Install endpoint"
          value={<span className="font-editorial-mono">/api/install</span>}
          action={<button type="button" aria-label="Copy install endpoint" className="border border-[var(--ink)] p-3"><CopyIcon /></button>}
        />
        <SettingsRow
          label="Feedback endpoint"
          value={<span className="font-editorial-mono">/api/feedback</span>}
          action={<button type="button" aria-label="Copy feedback endpoint" className="border border-[var(--ink)] p-3"><CopyIcon /></button>}
        />
        <p className="px-5 pb-5 text-sm text-[var(--ink)]/65">
          Invocations are counted when an agent submits feedback.
        </p>
      </SettingsSection>

      <SettingsSection title="05. Danger Zone">
        <SettingsRow
          label="Reset analytics"
          action={<button type="button" className={DASHBOARD_BUTTON_LIGHT}>Reset analytics</button>}
        />
        <SettingsRow
          label="Delete skill"
          action={<button type="button" className={`${DASHBOARD_BUTTON_LIGHT} font-bold`}>Delete skill</button>}
        />
      </SettingsSection>
    </div>
  );
}

export function AccountSettingsWorkspace({
  user,
  isAccountMenuOpen,
  onToggleAccountMenu,
  onOpenAccountSettings,
  onSignOut,
}: {
  user: AppUser;
  isAccountMenuOpen: boolean;
  onToggleAccountMenu: () => void;
  onOpenAccountSettings: () => void;
  onSignOut: () => void;
}) {
  const accountName = displayAccountName(user);
  const accountEmail = user.email || "jane@acme.dev";

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <AccountTopBar
        user={user}
        isAccountMenuOpen={isAccountMenuOpen}
        onToggleAccountMenu={onToggleAccountMenu}
        onOpenAccountSettings={onOpenAccountSettings}
        onSignOut={onSignOut}
      />

      <section className="mx-auto w-full max-w-7xl space-y-7 px-5 py-8 sm:px-8 lg:px-11">
        <header>
          <h1 className="font-editorial-sans text-5xl font-bold leading-none sm:text-6xl">
            Account Settings
          </h1>
          <p className="mt-3 text-lg leading-7">Manage your profile, preferences, and data.</p>
        </header>

        <section className="grid gap-6 border-t border-[var(--ink)] pt-6 lg:grid-cols-[16rem_1fr]">
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase">Profile</p>
            <p className="mt-3 text-sm leading-6">
              Update your personal information and how your name appears.
            </p>
          </div>
          <div className={DASHBOARD_CARD}>
            <SettingsRow label="Name" value={accountName} action={<button type="button" className={DASHBOARD_BUTTON}>Edit</button>} />
            <SettingsRow label="Email" value={accountEmail} action={<button type="button" className={DASHBOARD_BUTTON}>Edit</button>} />
            <SettingsRow
              label="Avatar"
              value={<span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ink)] font-editorial-mono text-sm font-bold text-[var(--paper)]">{skillInitials(accountName)}</span>}
              action={<button type="button" className={DASHBOARD_BUTTON_LIGHT}>Change</button>}
            />
          </div>
        </section>

        <section className="grid gap-6 border-t border-[var(--ink)] pt-6 lg:grid-cols-[16rem_1fr]">
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase">Preferences</p>
            <p className="mt-3 text-sm leading-6">
              Customize your default experience across Skillfully.
            </p>
          </div>
          <div className={DASHBOARD_CARD}>
            <SettingsRow
              label="Theme"
              action={
                <span className="inline-grid grid-cols-2 border border-[var(--ink)]">
                  <button type="button" className="px-9 py-2 text-sm">Light</button>
                  <button type="button" className="bg-[var(--ink)] px-9 py-2 text-sm text-[var(--paper)]">Dark</button>
                </span>
              }
            />
            <SettingsRow label="Default landing page" value="Overview" action={<span aria-hidden className="text-xl">⌄</span>} />
            <SettingsRow label="Time zone" value="(UTC-8) Pacific Time (US & Canada)" action={<span aria-hidden className="text-xl">⌄</span>} />
            <SettingsRow
              label="Email notifications"
              value="Important updates about your skills"
              action={<TogglePill label="" />}
            />
          </div>
        </section>

        <section className="grid gap-6 border-t border-[var(--ink)] pt-6 lg:grid-cols-[16rem_1fr]">
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase">Security</p>
            <p className="mt-3 text-sm leading-6">Keep your account secure.</p>
          </div>
          <div className={DASHBOARD_CARD}>
            <SettingsRow label="Password" action={<button type="button" className={DASHBOARD_BUTTON_LIGHT}>Change Password</button>} />
            <SettingsRow label="Active sessions" value="3 active sessions" action={<button type="button" className={DASHBOARD_BUTTON_LIGHT}>View Sessions</button>} />
          </div>
        </section>

        <section className="grid gap-6 border-t border-[var(--ink)] pt-6 lg:grid-cols-[16rem_1fr]">
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase">Data & Privacy</p>
            <p className="mt-3 text-sm leading-6">Manage your data and privacy settings.</p>
          </div>
          <div className={DASHBOARD_CARD}>
            <SettingsRow
              label="Export your data"
              value="Download a copy of your skills and analytics."
              action={<button type="button" className={DASHBOARD_BUTTON_LIGHT}>Export</button>}
            />
            <SettingsRow
              label="Delete account"
              value="Permanently delete your account and all data."
              action={<button type="button" className={DASHBOARD_BUTTON_LIGHT}>Delete</button>}
            />
          </div>
        </section>

        <p className="pt-3 font-editorial-mono text-sm">
          Questions? Contact us at <a href="mailto:hello@skillfully.dev" className="underline">hello@skillfully.dev</a>
        </p>
      </section>
    </div>
  );
}

export function SkillDetail({
  skill,
  entries,
  onBack,
  activeTab = "overview",
  onTabChange,
  onOpenEditor,
  feedbackTemplate,
  feedbackTemplateError,
}: {
  skill: Skill;
  entries: Feedback[];
  onBack: () => void;
  activeTab?: DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
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

  if (activeTab === "editor") {
    return <SkillEditorWorkspace skill={skill} />;
  }

  if (activeTab === "analytics") {
    return <SkillAnalyticsWorkspace />;
  }

  if (activeTab === "settings") {
    return <SkillSettingsWorkspace skill={skill} />;
  }

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
              if (onTabChange) {
                onTabChange("editor");
              } else {
                onOpenEditor?.();
              }
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
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [isSkillSelectorOpen, setIsSkillSelectorOpen] = useState(false);
  const [isCreateSkillModalOpen, setIsCreateSkillModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const [authPhase, setAuthPhase] = useState<AuthPhase>("request");
  const [authForm, setAuthForm] = useState<AuthForm>({ email: "", code: "" });
  const [pendingEmail, setPendingEmail] = useState("");

  const [skillForm, setSkillForm] = useState<SkillForm>({
    name: "",
    description: "",
  });
  const [modalSkillForm, setModalSkillForm] = useState<SkillForm>({
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
    setActiveTab("overview");
    setIsSkillSelectorOpen(false);
    setIsCreateSkillModalOpen(false);
    setIsAccountMenuOpen(false);
    setOnboardingDismissed(false);
    setScreen("list");

    await db.auth.signOut({ invalidateToken: true });
  }

  function openCreateSkill() {
    setOnboardingDismissed(true);
    setErrorMessage("");
    setIsSkillSelectorOpen(false);
    setIsAccountMenuOpen(false);
    setActiveTab("editor");
    setScreen("create");
  }

  function openCreateSkillModal() {
    setOnboardingDismissed(true);
    setErrorMessage("");
    setModalSkillForm({ name: "", description: "" });
    setIsSkillSelectorOpen(false);
    setIsAccountMenuOpen(false);
    setIsCreateSkillModalOpen(true);
  }

  function openOnboarding() {
    setOnboardingDismissed(false);
    setErrorMessage("");
    setIsSkillSelectorOpen(false);
    setIsAccountMenuOpen(false);
    setActiveTab("overview");
    setScreen("list");
  }

  function openDashboardTab(tab: DashboardTab) {
    posthog.capture("dashboard_tab_selected", { tab });
    setOnboardingDismissed(true);
    setErrorMessage("");
    setIsSkillSelectorOpen(false);
    setIsAccountMenuOpen(false);
    setActiveTab(tab);

    if (tab === "account") {
      setScreen("list");
      return;
    }

    if (skills.length === 0) {
      if (tab === "editor") {
        setScreen("create");
        return;
      }

      setScreen("list");
      return;
    }

    if (!selectedSkillId) {
      setSelectedSkillId(skills[0].id);
    }

    setScreen("detail");
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
    setModalSkillForm({ name: "", description: "" });
    setSelectedSkillId(newSkillEntityId);
    setActiveTab("overview");
    setOnboardingDismissed(true);
    setIsCreateSkillModalOpen(false);
    setIsSkillSelectorOpen(false);
    setScreen("detail");
    setErrorMessage("");
  }

  function createSkillFromModal(name: string, description: string) {
    if (!name.trim()) {
      setErrorMessage("Skill name is required");
      return;
    }

    createSkill(name, description);
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
          activeTab={screen === "create" ? "editor" : activeTab}
          selectedId={viewState.kind === "detail" ? viewState.skillId : selectedSkillId}
          isSkillSelectorOpen={isSkillSelectorOpen}
          onSelect={(skill) => {
            posthog.capture("skill_selected", { skill_name: skill.name });
            setSelectedSkillId(skill.id);
            setOnboardingDismissed(true);
            setIsSkillSelectorOpen(false);
            setIsAccountMenuOpen(false);
            setScreen("detail");
            setErrorMessage("");
          }}
          onTabChange={openDashboardTab}
          onToggleSkillSelector={() => {
            setIsSkillSelectorOpen((current) => !current);
            setIsAccountMenuOpen(false);
          }}
          onOpenCreateSkill={openCreateSkillModal}
          onSignOut={handleSignOut}
        />

        <section className="min-w-0">
          {activeTab === "account" ? (
            <AccountSettingsWorkspace
              user={user}
              isAccountMenuOpen={isAccountMenuOpen}
              onToggleAccountMenu={() => {
                setIsAccountMenuOpen((current) => !current);
                setIsSkillSelectorOpen(false);
              }}
              onOpenAccountSettings={() => openDashboardTab("account")}
              onSignOut={handleSignOut}
            />
          ) : viewState.kind === "create" ? (
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
              activeTab={activeTab}
              feedbackTemplate={feedbackTemplate}
              feedbackTemplateError={feedbackTemplateError}
              onTabChange={openDashboardTab}
              onBack={() => {
                setSelectedSkillId(null);
                setActiveTab("overview");
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
      {isCreateSkillModalOpen ? (
        <CreateSkillModal
          form={modalSkillForm}
          onChange={setModalSkillForm}
          onCancel={() => {
            setIsCreateSkillModalOpen(false);
            setErrorMessage("");
          }}
          onSubmit={createSkillFromModal}
        />
      ) : null}
    </main>
  );
}
