"use client";

import { type ComponentType, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Select, { type SingleValue, type StylesConfig } from "react-select";
import { db, isUsingLocalPreviewDb } from "@/lib/db";
import {
  captureClientEvent,
  captureClientException,
  identifyClientUser,
  resetClientAnalytics,
} from "@/lib/client-analytics";
import { type AppSchema } from "@/instant.schema";
import { type InstaQLEntity, id } from "@instantdb/react";
import type { User as InstantUser } from "@instantdb/core";
import {
  resolveDashboardViewState,
  shouldShowOnboardingModalByDefault,
} from "./view-state";
import { OnboardingModal } from "./onboarding-modal";

type Skill = InstaQLEntity<AppSchema, "skills">;
type Feedback = InstaQLEntity<AppSchema, "feedback">;
type SkillUsageEvent = InstaQLEntity<AppSchema, "skillUsageEvents">;
type AppUser = InstantUser;
type Screen = "list" | "create" | "detail";
type DashboardTab = "overview" | "editor" | "analytics" | "settings" | "account";
type SkillRouteTab = Exclude<DashboardTab, "account">;
type AuthPhase = "request" | "verify";
type ThemeMode = "light" | "dark" | "system";

type AuthForm = {
  email: string;
  code: string;
};

type SkillForm = {
  name: string;
  description: string;
};

type DashboardRouteProps = {
  initialSkillId?: string;
  initialTab?: DashboardTab;
  routeName?: string;
};

type SelectOption = {
  value: string;
  label: string;
};

type MdxMarkdownEditorProps = {
  markdown: string;
  onChange: (markdown: string) => void;
};

type RecentFeedbackRow = {
  sentiment: "positive" | "neutral" | "negative";
  rating: string;
  feedback: string;
  createdAt: string;
};
type UsageEventKind =
  | "public_page_view"
  | "skill_installed"
  | "manifest_checked"
  | "file_loaded"
  | "feedback_received"
  | string;

type PublishModalStep = "confirm" | "published" | "waiting" | "confirmed";
type SkillEditorFile = {
  id: string;
  path: string;
  kind: string;
  mimeType?: string | null;
  contentText?: string | null;
  storageUrl?: string | null;
  updatedAt?: number | null;
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
const validSkillRouteTabs: SkillRouteTab[] = ["overview", "editor", "analytics", "settings"];

const publishingDestinationRows = [
  ["skills.sh", "Available after publish", "Public manifest and Skillfully listing", "terminal"],
  ["GitHub", "Creates a pull request on publish", "Uses the configured GitHub target", "github"],
  ["LobeHub Skills", "Generates a submission packet", "Manual directory adapter", "circle"],
  ["ClawHub", "Generates a submission packet", "Manual directory adapter", "triangle"],
  ["Hermes Skills Hub", "Generates a submission packet", "Manual directory adapter", "square"],
] satisfies Array<[string, string, string, string]>;

function defaultEditorMarkdown(skill: Skill) {
  const summary = skill.description || "Describe what this skill helps an agent do.";
  return [
    `# ${skill.name}`,
    "",
    summary,
    "",
    "> Use this skill only when it matches the user's task.",
    "",
    "## When to use",
    "",
    "- The user asks for work that this skill is designed to handle",
    "- The needed source files, tools, or context are available",
    "- The expected output can be verified before finishing",
    "",
    "## Workflow",
    "",
    "1. Read the user's request and identify the concrete goal",
    "2. Gather the relevant project context before editing",
    "3. Make the smallest change that satisfies the task",
    "4. Verify the result with an appropriate command or check",
    "5. Report what changed and any remaining risk",
  ].join("\n");
}

function fallbackEditorFiles(skill: Skill): SkillEditorFile[] {
  return [
    {
      id: `local-${skill.id || skill.skillId}-SKILL.md`,
      path: "SKILL.md",
      kind: "markdown",
      mimeType: "text/markdown",
      contentText: defaultEditorMarkdown(skill),
    },
  ];
}

function isEditableSkillFile(file: SkillEditorFile) {
  return file.kind === "markdown" || file.mimeType?.startsWith("text/") || file.contentText !== undefined;
}

function sortSkillFiles(files: SkillEditorFile[]) {
  return [...files].sort((a, b) => a.path.localeCompare(b.path));
}

const skillSettingsPublishingRows = [
  ["skills.sh", "Publish on release", "Configured", "terminal", "bg-emerald-700"],
  ["GitHub", "Create PR on publish", "Configured", "github", "bg-emerald-700"],
  ["LobeHub Skills", "Manual submission packet", "Configured", "circle", "bg-emerald-700"],
  ["ClawHub", "Manual submission packet", "Configured", "triangle", "bg-emerald-700"],
  ["Hermes Skills Hub", "Manual submission packet", "Configured", "square", "bg-emerald-700"],
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

function usageSummary(events: SkillUsageEvent[]) {
  return events.reduce<Record<UsageEventKind, number>>((acc, event) => {
    const kind = String(event.eventKind || "unknown");
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  }, {});
}

function usageEventLabel(kind: UsageEventKind) {
  if (kind === "public_page_view") return "Public page views";
  if (kind === "skill_installed") return "Installs";
  if (kind === "manifest_checked") return "Update checks";
  if (kind === "file_loaded") return "File loads";
  if (kind === "feedback_received") return "Feedback events";
  return kind
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function pluralCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

function usageEventsByDay(events: SkillUsageEvent[], days = 7) {
  const now = new Date();
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    date.setUTCDate(date.getUTCDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      count: 0,
    };
  });
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  events.forEach((event) => {
    const key = typeof event.dayKey === "string" ? event.dayKey : new Date(toMillis(event.createdAt)).toISOString().slice(0, 10);
    const bucket = bucketMap.get(key);
    if (bucket) {
      bucket.count += 1;
    }
  });

  return buckets;
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
    return "Account";
  }

  const handle = email.split("@")[0] || "Account";

  return handle
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Account";
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
    .replace(/^-+|-+$/g, "") || "skill";
}

function formatTimestamp(value: number | Date | null | undefined) {
  const millis = toMillis(value);
  if (!millis) {
    return "Unknown";
  }

  return `${new Date(millis).toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

function isSkillRouteTab(value: DashboardTab): value is SkillRouteTab {
  return validSkillRouteTabs.includes(value as SkillRouteTab);
}

function skillRoute(skill: Skill, tab: SkillRouteTab) {
  return `/dashboard/${skill.skillId || skill.id}/${tab}`;
}

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 46,
    borderRadius: 0,
    borderColor: "var(--ink)",
    borderWidth: 1,
    boxShadow: state.isFocused ? "0 0 0 2px var(--ink)" : "none",
    backgroundColor: "var(--paper)",
    color: "var(--ink)",
    fontFamily: "var(--font-space-grotesk), Space Grotesk, sans-serif",
    ":hover": {
      borderColor: "var(--ink)",
    },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
    borderRadius: 0,
    border: "1px solid var(--ink)",
    backgroundColor: "var(--white)",
    boxShadow: "6px 6px 0 var(--ink)",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused || state.isSelected ? "var(--paper)" : "var(--white)",
    color: "var(--ink)",
    cursor: "pointer",
    fontSize: 14,
  }),
  singleValue: (base) => ({ ...base, color: "var(--ink)" }),
  input: (base) => ({ ...base, color: "var(--ink)" }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: "var(--ink)" }),
  dropdownIndicator: (base) => ({ ...base, color: "var(--ink)" }),
};

function DashboardSelect({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <Select<SelectOption, false>
      aria-label={ariaLabel}
      className="min-w-40 font-editorial-sans text-sm"
      instanceId={ariaLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
      isSearchable={false}
      options={options}
      styles={selectStyles}
      value={selected}
      onChange={(nextValue: SingleValue<SelectOption>) => {
        if (nextValue) {
          onChange(nextValue.value);
        }
      }}
    />
  );
}

function MdxMarkdownEditor(props: MdxMarkdownEditorProps) {
  const [Editor, setEditor] = useState<ComponentType<MdxMarkdownEditorProps> | null>(null);

  useEffect(() => {
    let isMounted = true;

    import("./mdx-editor-client").then((mod) => {
      if (isMounted) {
        setEditor(() => mod.MdxMarkdownEditor);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!Editor) {
    return (
      <div className="h-full min-h-72 border border-[var(--ink)] bg-[var(--paper)] p-5 font-editorial-mono text-xs uppercase">
        MDXEditor loading...
      </div>
    );
  }

  return <Editor {...props} />;
}

function useOptionalRouter() {
  try {
    return useRouter();
  } catch {
    return {
      push: () => undefined,
    };
  }
}

function dashboardAuthHeaders(user: AppUser, contentType: string | null = "application/json") {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers["content-type"] = contentType;
  }

  if (isUsingLocalPreviewDb || !user.refresh_token) {
    headers["x-skillfully-preview-user-id"] = user.id;
    headers["x-skillfully-preview-user-email"] = user.email || "preview@skillfully.local";
    return headers;
  }

  headers.authorization = `Bearer ${user.refresh_token}`;
  return headers;
}

async function dashboardJson<T>(user: AppUser, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(dashboardAuthHeaders(user, "application/json"))) {
    headers.set(key, value);
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

async function dashboardFormData<T>(user: AppUser, path: string, body: FormData, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(dashboardAuthHeaders(user, null))) {
    headers.set(key, value);
  }

  const response = await fetch(path, {
    ...init,
    method: init.method || "POST",
    headers,
    body,
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
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
  onCodePaste,
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
  onCodePaste: () => void;
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
                  onPaste={onCodePaste}
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
  ];
  const selectedOption =
    skillOptions.find((option) => option.id === selectedId) ?? skillOptions[0] ?? null;

  return (
    <div className="relative z-50 min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex w-full min-w-0 items-center justify-between gap-3 border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-left font-editorial-mono text-sm transition hover:bg-[var(--white)]"
        onClick={onToggle}
      >
        <span className="min-w-0 truncate">{selectedOption?.name ?? "No skills yet"}</span>
        <span aria-hidden className="text-xl leading-none">{isOpen ? "⌃" : "⌄"}</span>
      </button>

      {isOpen ? (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.45rem)] z-[100] w-[min(18rem,calc(100vw-2.5rem))] border border-[var(--ink)] bg-[var(--white)] p-2 shadow-[6px_6px_0_var(--ink)]"
        >
          <div className="space-y-1">
            {skillOptions.length === 0 ? (
              <p className="px-3 py-3 font-editorial-mono text-xs uppercase text-[var(--ink)]/65">
                No skills yet.
              </p>
            ) : null}
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
              placeholder="e.g. code-review"
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
    <aside className="relative z-40 flex min-h-0 w-full max-w-full min-w-0 flex-col overflow-visible border-b border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-b-0 lg:border-r">
      <div className="border-b border-[var(--ink)] px-5 py-4 lg:py-6">
        <BrandMark />
      </div>

      <div className="min-w-0 px-5 py-4 lg:py-7">
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

      <nav className="grid grid-cols-2 border-y border-[var(--ink)] font-editorial-sans text-sm sm:grid-cols-4 lg:block">
        {navItems.map(([tab, label]) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              className={`flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left lg:px-5 lg:py-4 ${
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

      <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:mt-auto lg:block lg:space-y-5 lg:py-6">
        <button
          type="button"
          className="flex w-full items-center gap-3 border border-[var(--ink)] px-4 py-3 text-left font-editorial-mono text-sm hover:bg-[var(--white)]"
          onClick={onOpenCreateSkill}
        >
          <span aria-hidden className="text-2xl leading-none">+</span>
          New Skill
        </button>

        <div className="hidden border border-[var(--ink)] p-4 lg:block">
          <p className="font-editorial-mono text-xs font-bold uppercase">Need help?</p>
          <p className="mt-3 text-sm leading-6">
            Read the guide to learn how to build great agent skills.
          </p>
          <button type="button" className="mt-5 font-editorial-mono text-xs font-bold uppercase underline">
            Open Guide <span aria-hidden>→</span>
          </button>
        </div>

        <div className="min-w-0 space-y-2 sm:col-span-2 lg:space-y-3">
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
          <div className="flex min-w-0 items-center justify-between gap-4 lg:block">
            <p className="min-w-0 truncate font-editorial-mono text-[0.68rem] text-[var(--ink)]/65">
              {displayUserEmail(user)}
            </p>
            <button
              type="button"
              className="shrink-0 font-editorial-mono text-[0.68rem] font-bold uppercase underline lg:mt-2"
              onClick={onSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
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

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className={`${DASHBOARD_CARD} p-6 sm:p-8`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">{label}</p>
      <div className="mt-8 font-editorial-sans text-5xl font-semibold sm:text-6xl">
        {value}
      </div>
      <p className="mt-4 font-editorial-sans text-base text-[var(--ink)]/70">{detail}</p>
    </article>
  );
}

function UsageChart({ events }: { events: SkillUsageEvent[] }) {
  const buckets = usageEventsByDay(events);
  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const counts = usageSummary(events);
  const total = events.length;

  return (
    <section className={`${DASHBOARD_CARD} p-6 sm:p-8`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-editorial-mono text-xs font-bold uppercase">Usage over time</p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--ink)]/70">
            Recorded from public page views, manifest update checks, file loads, and feedback submissions.
          </p>
        </div>
        <div className="border border-[var(--ink)] bg-[var(--white)] px-4 py-3 text-right">
          <p className="font-editorial-mono text-[0.62rem] font-bold uppercase">Total events</p>
          <p className="font-editorial-sans text-3xl font-semibold">{total.toLocaleString()}</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="mt-8 flex min-h-64 items-center justify-center border border-dashed border-[var(--ink)]/40 bg-[var(--white)] p-8 text-center">
          <div>
            <p className="font-editorial-sans text-xl font-semibold">No usage data yet</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--ink)]/65">
              This chart will populate after Skillfully records public skill page views, update checks, file loads, or feedback events.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_16rem]">
          <div className="flex min-h-64 items-end gap-3 border border-[var(--ink)] bg-[var(--white)] p-5">
            {buckets.map((bucket) => (
              <div key={bucket.key} className="flex min-w-0 flex-1 flex-col items-center gap-3">
                <div className="flex h-44 w-full items-end border-x border-[var(--ink)]/15 px-1">
                  <div
                    className="w-full bg-[var(--ink)]"
                    style={{ height: `${Math.max(6, (bucket.count / maxCount) * 100)}%` }}
                    aria-label={`${bucket.label}: ${bucket.count} usage events`}
                  />
                </div>
                <span className="font-editorial-mono text-[0.62rem] uppercase">{bucket.label}</span>
              </div>
            ))}
          </div>
          <div className="border border-[var(--ink)] bg-[var(--white)] p-5">
            <p className="font-editorial-mono text-xs font-bold uppercase">Event mix</p>
            <div className="mt-5 space-y-4 text-sm">
              {(["public_page_view", "skill_installed", "manifest_checked", "file_loaded", "feedback_received"] as const).map((kind) => (
                <div key={kind} className="flex items-center justify-between gap-4">
                  <span>{usageEventLabel(kind)}</span>
                  <span className="font-editorial-mono">{(counts[kind] ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SkillHealth() {
  return (
    <section className={`${DASHBOARD_CARD} p-6 sm:p-8`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">Skill health</p>
      <p className="mt-6 text-sm leading-6 text-[var(--ink)]/70">Health checks appear after runtime telemetry is connected.</p>
    </section>
  );
}

function AttentionPanel() {
  return (
    <section className={`${DASHBOARD_CARD} p-6`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">Needs attention</p>
      <p className="mt-6 text-sm leading-6 text-[var(--ink)]/70">No attention items yet.</p>
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
          positive: 0,
          neutral: 0,
          negative: 0,
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
        <span>{total === 1 ? "1 feedback" : `${total} feedback`}</span>
      </div>
      {total === 0 ? (
        <p className="mt-4 border border-dashed border-[var(--ink)]/35 bg-[var(--white)] p-4 text-sm text-[var(--ink)]/70">
          No feedback yet.
        </p>
      ) : null}
    </section>
  );
}

function feedbackRowsFromEntries(entries: Feedback[]) {
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
        createdAt: formatTimestamp(entry.createdAt),
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
              <th className="px-6 py-4 text-right font-bold">Received</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-[var(--ink)]/65">
                  No feedback yet.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.feedback}-${index}`} className="border-b border-[var(--ink)]/20 last:border-b-0">
                  <td className="px-6 py-4">
                    <SentimentBadge sentiment={row.sentiment} />
                  </td>
                  <td className="px-4 py-4 font-editorial-sans font-semibold">{row.rating}</td>
                  <td className="px-4 py-4">{row.feedback}</td>
                  <td className="px-6 py-4 text-right font-editorial-mono text-xs">{row.createdAt}</td>
                </tr>
              ))
            )}
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
        {publishingDestinationRows.map(([name, status, detail, icon], index) => (
          <article key={name} className={`space-y-4 ${index > 0 ? "xl:border-l xl:border-[var(--ink)]/25 xl:pl-6" : ""}`}>
            <TargetIcon name={icon} />
            <div className="font-editorial-sans text-base">{name}</div>
            <div className="flex items-center gap-2 text-sm">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[var(--gray)]" />
              {status}
            </div>
            <div className="font-editorial-mono text-sm leading-5">{detail}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function VersionSnapshot({ skill }: { skill: Skill }) {
  const rows = [
    skill.publishedVersionId
      ? ["Published version", "Published", "A frozen version is available for public installs"]
      : null,
    skill.currentDraftVersionId
      ? ["Current draft", "Draft", "Editable files are saved in the draft version"]
      : null,
  ].filter(Boolean) as Array<[string, string, string]>;

  return (
    <section className={`${DASHBOARD_CARD} overflow-hidden`}>
      <div className="p-6 pb-3">
        <p className="font-editorial-mono text-xs font-bold uppercase">Version snapshot</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead className="font-editorial-mono text-xs uppercase">
            <tr className="border-b border-[var(--ink)]/25">
              <th className="px-6 py-4 font-bold">Record</th>
              <th className="px-4 py-4 font-bold">Status</th>
              <th className="px-4 py-4 font-bold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-[var(--ink)]/65">
                  No published versions yet.
                </td>
              </tr>
            ) : (
              rows.map(([record, status, notes]) => (
                <tr key={record} className="border-b border-[var(--ink)]/20 last:border-b-0">
                  <td className="px-6 py-4 font-editorial-mono text-xs">{record}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-editorial-mono text-xs leading-5">{notes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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

function buildPublicInstallPrompt(skill: Skill) {
  const repoFullName =
    typeof skill.originalRepoFullName === "string" && skill.originalRepoFullName
      ? skill.originalRepoFullName
      : "erensunerr/skillfully-skills";
  const skillRoot =
    typeof skill.originalSkillPath === "string" && skill.originalSkillPath
      ? skill.originalSkillPath
      : `skills/${skill.slug || skill.name}`;
  return [
    `Install the ${skill.name} skill from GitHub (${repoFullName}).`,
    `Skill path: ${skillRoot}`,
    "",
    "When the install is done, call:",
    `POST https://www.skillfully.sh/api/public/skills/${skill.skillId}/install`,
    "",
    "Before each use, check for the latest version:",
    `Manifest URL: https://www.skillfully.sh/api/public/skills/${skill.skillId}/manifest`,
    "",
    "Then load the published files from the manifest and use the latest SKILL.md as your operating instructions.",
  ].join("\n");
}

function PublishSkillModal({
  step,
  skillName,
  installPrompt,
  installPromptCopied,
  onCancel,
  onConfirm,
  onCopyInstallPrompt,
  onContinueToInstallCheck,
  onFinish,
}: {
  step: PublishModalStep;
  skillName: string;
  installPrompt: string;
  installPromptCopied: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onCopyInstallPrompt: () => void;
  onContinueToInstallCheck: () => void;
  onFinish: () => void;
}) {
  const stepIndex = step === "confirm" ? 1 : step === "published" ? 2 : 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/35 px-5 py-8 backdrop-blur-[1px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-skill-title"
        className="w-full max-w-2xl border-2 border-[var(--ink)] bg-[var(--white)] p-6 shadow-[8px_8px_0_var(--ink)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase">Publish step {stepIndex} of 3</p>
            <h2 id="publish-skill-title" className="mt-3 font-editorial-sans text-3xl font-bold">
              {step === "confirm"
                ? "Are you sure?"
                : step === "published"
                  ? "Your skill has been published."
                  : step === "waiting"
                    ? "Waiting for installation confirmation"
                    : "It works now!"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close publish modal"
            className="border border-[var(--ink)] px-3 py-1 font-editorial-mono text-lg"
            onClick={onCancel}
          >
            ×
          </button>
        </div>

        {step === "confirm" ? (
          <>
            <p className="mt-6 text-lg leading-8">
              This will make <strong>{skillName}</strong> publicly accessible.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" className={DASHBOARD_BUTTON_LIGHT} onClick={onCancel}>
                No, keep draft
              </button>
              <button type="button" className={DASHBOARD_BUTTON} onClick={onConfirm}>
                Yes, publish
              </button>
            </div>
          </>
        ) : null}

        {step === "published" ? (
          <>
            <p className="mt-6 text-base leading-7">
              Paste this into Codex or Claude Code to install your skill. You can also share it with friends.
            </p>
            <pre className="mt-5 max-h-56 overflow-auto border border-[var(--ink)] bg-[var(--paper)] p-4 font-editorial-mono text-xs leading-5">
              {installPrompt}
            </pre>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" className={DASHBOARD_BUTTON_LIGHT} onClick={onCopyInstallPrompt}>
                {installPromptCopied ? "Copied" : "Copy installation prompt"}
              </button>
              <button type="button" className={DASHBOARD_BUTTON} onClick={onContinueToInstallCheck}>
                Check installation
              </button>
            </div>
          </>
        ) : null}

        {step === "waiting" || step === "confirmed" ? (
          <>
            <div className="mt-8 border border-[var(--ink)] bg-[var(--paper)] p-5">
              <div className="flex items-center gap-4">
                <span
                  aria-hidden
                  className={`h-3 w-3 rounded-full ${
                    step === "confirmed" ? "bg-emerald-700" : "animate-pulse bg-[var(--ink)]"
                  }`}
                />
                <p className="font-editorial-sans text-lg">
                  {step === "confirmed"
                    ? "It works now!"
                    : "Waiting for installation confirmation..."}
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                className={step === "confirmed" ? DASHBOARD_BUTTON : DASHBOARD_BUTTON_LIGHT}
                disabled={step === "waiting"}
                onClick={onFinish}
              >
                Finish
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

function EditorPanelToggle({
  label,
  isOpen,
  onToggle,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="font-editorial-mono text-xs font-bold uppercase">{label}</p>
      <button
        type="button"
        aria-label={`${isOpen ? "Collapse" : "Expand"} ${label.toLowerCase()}`}
        className="text-2xl leading-none"
        onClick={onToggle}
      >
        {isOpen ? "‹" : "›"}
      </button>
    </div>
  );
}

function CollapsedEditorRail({
  label,
  onToggle,
}: {
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="flex h-full min-h-16 w-full items-center justify-center border-[var(--ink)] font-editorial-mono text-xs font-bold uppercase"
      aria-label={`Expand ${label.toLowerCase()}`}
      onClick={onToggle}
    >
      <span className="xl:[writing-mode:vertical-rl]">{label}</span>
      <span aria-hidden className="ml-2 xl:ml-0 xl:mt-3">›</span>
    </button>
  );
}

function editorGridClass(isFilesOpen: boolean, isFrontmatterOpen: boolean) {
  if (isFilesOpen && isFrontmatterOpen) {
    return "xl:grid-cols-[17.5rem_minmax(0,1fr)_21.5rem]";
  }

  if (!isFilesOpen && isFrontmatterOpen) {
    return "xl:grid-cols-[3.5rem_minmax(0,1fr)_21.5rem]";
  }

  if (isFilesOpen && !isFrontmatterOpen) {
    return "xl:grid-cols-[17.5rem_minmax(0,1fr)_3.5rem]";
  }

  return "xl:grid-cols-[3.5rem_minmax(0,1fr)_3.5rem]";
}

function SkillEditorWorkspace({
  skill,
  user,
}: {
  skill: Skill;
  user?: AppUser | null;
}) {
  const [files, setFiles] = useState<SkillEditorFile[]>(() => fallbackEditorFiles(skill));
  const [selectedFileId, setSelectedFileId] = useState(() => fallbackEditorFiles(skill)[0]?.id ?? "");
  const [dirtyFileIds, setDirtyFileIds] = useState<Set<string>>(() => new Set());
  const [frontmatter, setFrontmatter] = useState({
    name: skill.name,
    summary: skill.description || "Describe what this skill helps an agent do.",
    version: "0.1.0",
    status: "Draft",
  });
  const [isFilesOpen, setIsFilesOpen] = useState(true);
  const [isFrontmatterOpen, setIsFrontmatterOpen] = useState(true);
  const [publishStep, setPublishStep] = useState<PublishModalStep | null>(null);
  const [installPromptCopied, setInstallPromptCopied] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [fileStatus, setFileStatus] = useState("Autosaves to Skillfully.");
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [isFileSaving, setIsFileSaving] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [deletingFileIds, setDeletingFileIds] = useState<Set<string>>(() => new Set());
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const publicInstallPrompt = useMemo(
    () => buildPublicInstallPrompt(skill),
    [
      skill.name,
      skill.originalRepoFullName,
      skill.originalSkillPath,
      skill.skillId,
      skill.slug,
    ],
  );
  const markdownFiles = files.filter(isEditableSkillFile);
  const assetFiles = files.filter((file) => !isEditableSkillFile(file));
  const selectedFile =
    files.find((file) => file.id === selectedFileId) ?? markdownFiles[0] ?? files[0] ?? null;
  const selectedFileIsEditable = selectedFile ? isEditableSkillFile(selectedFile) : false;
  const selectedMarkdown = selectedFileIsEditable ? selectedFile?.contentText ?? "" : "";
  const selectedFileGetsManagedBlock = selectedFile?.path.split("/").pop()?.toLowerCase() === "skill.md";
  const canPersistFiles = Boolean(user && !isUsingLocalPreviewDb);
  const hasPendingAutosave = canPersistFiles && dirtyFileIds.size > 0;
  const editorStatusLabel = skill.status === "published" || skill.publishedVersionId ? "Published" : "Draft";
  const editorValidationRows = [
    ["SKILL.md present", files.some((file) => file.path.toLowerCase() === "skill.md") ? "Yes" : "Missing"],
    ["Editable files", String(markdownFiles.length)],
    ["Uploaded assets", String(assetFiles.length)],
  ] satisfies Array<[string, string]>;

  useEffect(() => {
    if (publishStep !== "waiting") {
      return;
    }

    const timer = window.setTimeout(() => {
      setPublishStep("confirmed");
    }, 1300);

    return () => window.clearTimeout(timer);
  }, [publishStep]);

  useEffect(() => {
    const fallbackFiles = fallbackEditorFiles(skill);
    setFrontmatter((state) => ({
      ...state,
      name: skill.name,
      summary: skill.description || "Describe what this skill helps an agent do.",
    }));
    setDirtyFileIds(new Set());
    setDeletingFileIds(new Set());

    if (!user || isUsingLocalPreviewDb) {
      setFiles(fallbackFiles);
      setSelectedFileId(fallbackFiles[0]?.id ?? "");
      setFileStatus("Local preview changes are kept in memory.");
      return;
    }

    let active = true;
    setIsFileLoading(true);
    setFileStatus("Loading skill files...");
    dashboardJson<{ files: SkillEditorFile[] }>(user, `/api/dashboard/skills/${skill.skillId}/files`)
      .then((payload) => {
        if (!active) return;
        const loadedFiles = sortSkillFiles(payload.files.length > 0 ? payload.files : fallbackFiles);
        setFiles(loadedFiles);
        setSelectedFileId((current) => {
          if (loadedFiles.some((file) => file.id === current)) {
            return current;
          }
          return loadedFiles.find(isEditableSkillFile)?.id ?? loadedFiles[0]?.id ?? "";
        });
        setFileStatus("All changes saved.");
      })
      .catch((error) => {
        if (!active) return;
        captureClientException(error);
        setFiles(fallbackFiles);
        setSelectedFileId(fallbackFiles[0]?.id ?? "");
        setFileStatus(`Could not load saved files: ${extractErrorMessage(error)}`);
      })
      .finally(() => {
        if (active) {
          setIsFileLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [skill.id, skill.skillId, skill.name, skill.description, user?.id, user?.refresh_token]);

  function updateSelectedMarkdown(markdown: string) {
    if (!selectedFile || !selectedFileIsEditable) {
      return;
    }

    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === selectedFile.id ? { ...file, contentText: markdown } : file,
      ),
    );
    setDirtyFileIds((current) => {
      const next = new Set(current);
      next.add(selectedFile.id);
      return next;
    });
    setFileStatus("Unsaved changes.");
  }

  async function saveDirtyFiles(fileIds = dirtyFileIds) {
    const dirtyFiles = files.filter((file) => fileIds.has(file.id) && isEditableSkillFile(file));
    if (dirtyFiles.length === 0) {
      return true;
    }
    if (!user || isUsingLocalPreviewDb) {
      setFileStatus("Local preview changes are kept in memory.");
      setDirtyFileIds(new Set());
      return true;
    }

    setIsFileSaving(true);
    setFileStatus("Saving changes...");
    try {
      const savedFiles = await Promise.all(dirtyFiles.map((file) =>
        dashboardJson<{ file: SkillEditorFile }>(
          user,
          `/api/dashboard/skills/${skill.skillId}/files/${file.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              path: file.path,
              content_text: file.contentText ?? "",
            }),
          },
        ),
      ));
      setFiles((currentFiles) => sortSkillFiles(
        currentFiles.map((file) => savedFiles.find((payload) => payload.file.id === file.id)?.file ?? file),
      ));
      setDirtyFileIds((current) => {
        const next = new Set(current);
        dirtyFiles.forEach((file) => next.delete(file.id));
        return next;
      });
      setFileStatus("All changes saved.");
      return true;
    } catch (error) {
      captureClientException(error);
      setFileStatus(`Save failed: ${extractErrorMessage(error)}`);
      return false;
    } finally {
      setIsFileSaving(false);
    }
  }

  useEffect(() => {
    if (dirtyFileIds.size === 0 || isFileLoading || isFileSaving) {
      return;
    }

    const fileIdsToSave = new Set(dirtyFileIds);
    const timer = window.setTimeout(() => {
      void saveDirtyFiles(fileIdsToSave);
    }, 850);

    return () => window.clearTimeout(timer);
  }, [dirtyFileIds, files, isFileLoading, isFileSaving, user?.id, user?.refresh_token]);

  async function uploadSkillFile(file: File | null | undefined) {
    if (!file) {
      return;
    }

    if (!user || isUsingLocalPreviewDb) {
      setFileStatus("Uploads require connected Skillfully storage.");
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("path", file.name);
    setIsUploadingFile(true);
    setFileStatus(`Uploading ${file.name}...`);
    try {
      const payload = await dashboardFormData<{ file: SkillEditorFile }>(
        user,
        `/api/dashboard/skills/${skill.skillId}/files`,
        body,
      );
      setFiles((currentFiles) => sortSkillFiles([
        ...currentFiles.filter((currentFile) => currentFile.id !== payload.file.id),
        payload.file,
      ]));
      if (isEditableSkillFile(payload.file)) {
        setSelectedFileId(payload.file.id);
      }
      setFileStatus(`Uploaded ${payload.file.path}.`);
    } catch (error) {
      captureClientException(error);
      setFileStatus(`Upload failed: ${extractErrorMessage(error)}`);
    } finally {
      setIsUploadingFile(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  }

  async function deleteAssetFile(file: SkillEditorFile) {
    if (!user || isUsingLocalPreviewDb) {
      setFileStatus("Deleting assets requires connected Skillfully storage.");
      return;
    }

    setDeletingFileIds((current) => new Set(current).add(file.id));
    setFileStatus(`Deleting ${file.path}...`);
    try {
      await dashboardJson<{ file: SkillEditorFile }>(
        user,
        `/api/dashboard/skills/${skill.skillId}/files/${file.id}`,
        { method: "DELETE" },
      );
      setFiles((currentFiles) => currentFiles.filter((currentFile) => currentFile.id !== file.id));
      setFileStatus(`Deleted ${file.path}.`);
    } catch (error) {
      captureClientException(error);
      setFileStatus(`Delete failed: ${extractErrorMessage(error)}`);
    } finally {
      setDeletingFileIds((current) => {
        const next = new Set(current);
        next.delete(file.id);
        return next;
      });
    }
  }

  async function copyPublicInstallPrompt() {
    await navigator.clipboard.writeText(publicInstallPrompt);
    setInstallPromptCopied(true);
    window.setTimeout(() => setInstallPromptCopied(false), 1200);
  }

  async function publishVersion() {
    setPublishError("");
    if (!user || isUsingLocalPreviewDb) {
      setPublishStep("published");
      return;
    }

    try {
      const result = await dashboardJson<{
        results: Array<{ targetKind: string; status: string; error?: string }>;
      }>(user, `/api/dashboard/skills/${skill.skillId}/publish`, {
        method: "POST",
      });
      const failures = result.results.filter((entry) => entry.status === "failed");
      if (failures.length > 0) {
        setPublishError(
          failures.map((entry) => `${entry.targetKind}: ${entry.error || "failed"}`).join(" | "),
        );
      }
      if (result.results.some((entry) => entry.status === "published" || entry.status === "submitted")) {
        setPublishStep("published");
      } else if (failures.length === 0) {
        setPublishError("No publish target completed. Connect GitHub before publishing.");
      }
    } catch (error) {
      captureClientException(error);
      setPublishError(extractErrorMessage(error));
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--paper)] text-[var(--ink)]">
      <section className={`grid min-h-0 flex-1 overflow-hidden border-b border-[var(--ink)] ${editorGridClass(isFilesOpen, isFrontmatterOpen)}`}>
        <aside className={`min-h-0 overflow-hidden border-b border-[var(--ink)] xl:border-b-0 xl:border-r ${isFilesOpen ? "p-5" : "p-0"}`}>
          {isFilesOpen ? (
            <div className="flex h-full min-h-0 flex-col">
              <EditorPanelToggle
                label="Files"
                isOpen={isFilesOpen}
                onToggle={() => setIsFilesOpen((current) => !current)}
              />
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-3 border border-[var(--ink)] px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canPersistFiles || isUploadingFile}
                  onClick={() => uploadInputRef.current?.click()}
                >
                  <span className="text-2xl leading-none">+</span>
                  {isUploadingFile ? "Uploading..." : "Upload file"}
                </button>
                <input
                  ref={uploadInputRef}
                  type="file"
                  className="sr-only"
                  onChange={(event) => void uploadSkillFile(event.currentTarget.files?.[0])}
                />

                <div className="mt-6">
                  <p className="font-editorial-mono text-xs font-bold uppercase">Markdown files (editable)</p>
                  <div className="mt-4 space-y-2">
                    {markdownFiles.map((file) => {
                      const isActive = selectedFile?.id === file.id;
                      const isDirty = dirtyFileIds.has(file.id);
                      return (
                        <button
                          key={file.id}
                          type="button"
                          className={`flex w-full items-center justify-between px-3 py-3 text-left text-sm ${
                            isActive ? "bg-[var(--white)] font-semibold" : "hover:bg-[var(--white)]"
                          }`}
                          onClick={() => setSelectedFileId(file.id)}
                        >
                          <span className="flex items-center gap-3">
                            <FileGlyph />
                            {file.path}
                          </span>
                          <span className="flex items-center gap-2">
                            {isDirty ? <span className="font-editorial-mono text-[0.62rem] uppercase">Unsaved</span> : null}
                            {isActive ? <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--ink)]" /> : null}
                          </span>
                        </button>
                      );
                    })}
                    {markdownFiles.length === 0 ? (
                      <p className="px-3 py-3 font-editorial-mono text-xs uppercase">No editable files yet.</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 border-t border-[var(--ink)] pt-6">
                  <p className="font-editorial-mono text-xs font-bold uppercase">Assets</p>
                  <div className="mt-4 space-y-2">
                    {assetFiles.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between px-3 py-3 text-sm">
                        <span className="min-w-0 truncate">{asset.path}</span>
                        <button
                          type="button"
                          className="border border-[var(--ink)] px-2 py-1 font-editorial-mono text-[0.62rem] uppercase disabled:opacity-50"
                          disabled={deletingFileIds.has(asset.id)}
                          onClick={() => void deleteAssetFile(asset)}
                        >
                          {deletingFileIds.has(asset.id) ? "Deleting" : "Delete"}
                        </button>
                      </div>
                    ))}
                    {assetFiles.length === 0 ? (
                      <p className="px-3 py-3 font-editorial-mono text-xs uppercase">No assets uploaded.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <CollapsedEditorRail label="Files" onToggle={() => setIsFilesOpen(true)} />
          )}
        </aside>

        <section className="min-h-0 min-w-0 border-b border-[var(--ink)] bg-[var(--white)] xl:border-b-0 xl:border-r">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex min-h-12 items-center justify-between border-b border-[var(--ink)] px-5">
              <p className="font-editorial-mono text-xs font-bold uppercase">Markdown editor</p>
              <span className="font-editorial-mono text-xs">
                {isFileLoading ? "Loading files..." : selectedFile?.path || "No file selected"}
              </span>
            </div>
            <div className="sr-only">When to use Workflow</div>
            <div className="min-h-0 flex-1">
              {selectedFileIsEditable ? (
                <MdxMarkdownEditor markdown={selectedMarkdown} onChange={updateSelectedMarkdown} />
              ) : (
                <div className="h-full min-h-72 border border-[var(--ink)] bg-[var(--paper)] p-5 font-editorial-mono text-xs uppercase">
                  Select an editable markdown file.
                </div>
              )}
            </div>
            {selectedFileGetsManagedBlock ? (
              <div className="border-t border-[var(--ink)] bg-[var(--white)] px-8 py-4">
                <div className="inline-flex max-w-full items-center gap-3 border border-[var(--ink)] bg-[var(--paper)] px-4 py-3">
                  <span aria-hidden className="font-editorial-sans text-lg leading-none">›</span>
                  <div className="min-w-0">
                    <p className="font-editorial-sans text-sm font-semibold">Skillfully feedback and update instructions</p>
                    <p className="mt-1 truncate font-editorial-mono text-[0.62rem] uppercase text-[var(--ink)]/60">
                      Locked system block added on publish
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className={`min-h-0 overflow-hidden ${isFrontmatterOpen ? "p-5" : "p-0"}`}>
          {isFrontmatterOpen ? (
            <div className="flex h-full min-h-0 flex-col">
              <EditorPanelToggle
                label="Frontmatter"
                isOpen={isFrontmatterOpen}
                onToggle={() => setIsFrontmatterOpen((current) => !current)}
              />
              <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-5">
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
                    <div className="mt-2 border border-[var(--ink)] bg-[var(--paper)] px-3 py-3 font-editorial-mono text-sm">
                      {editorStatusLabel}
                    </div>
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
                  <p className="mt-4 text-sm leading-6 text-[var(--ink)]/70">
                    Version history appears after the first publish.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <CollapsedEditorRail label="Frontmatter" onToggle={() => setIsFrontmatterOpen(true)} />
          )}
        </aside>
      </section>

      <section className="flex min-h-24 flex-col gap-3 border-b border-[var(--ink)] p-4 sm:flex-row sm:items-center sm:justify-end">
        <p className="mr-auto border border-[var(--ink)] bg-[var(--white)] p-3 font-editorial-mono text-xs font-bold uppercase">
          {hasPendingAutosave || isFileSaving ? "Saving automatically..." : fileStatus}
        </p>
        {publishError ? (
          <p className="border border-red-600 bg-red-50 p-3 font-editorial-mono text-xs font-bold uppercase text-red-700">
            {publishError}
          </p>
        ) : null}
        <Link href={skillRoute(skill, "settings")} className={`${DASHBOARD_BUTTON_LIGHT} text-center`}>
          Change publishing options
        </Link>
        <button
          type="button"
          className="border border-[var(--ink)] bg-[var(--ink)] px-6 py-4 font-editorial-sans text-lg font-semibold text-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isFileLoading || isFileSaving || isUploadingFile}
          onClick={async () => {
            if (!(await saveDirtyFiles())) {
              return;
            }
            setInstallPromptCopied(false);
            setPublishStep("confirm");
          }}
        >
          {isFileSaving ? "Saving..." : "Publish version"}
        </button>
      </section>

      {publishStep ? (
        <PublishSkillModal
          step={publishStep}
          skillName={skill.name}
          installPrompt={publicInstallPrompt}
          installPromptCopied={installPromptCopied}
          onCancel={() => setPublishStep(null)}
          onConfirm={() => void publishVersion()}
          onCopyInstallPrompt={() => void copyPublicInstallPrompt()}
          onContinueToInstallCheck={() => setPublishStep("waiting")}
          onFinish={() => setPublishStep(null)}
        />
      ) : null}
    </div>
  );
}

function AnalyticsSummaryCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className={`${DASHBOARD_CARD} p-5`}>
      <h2 className="font-editorial-sans text-2xl font-semibold">{title}</h2>
      <div className="mt-3 font-editorial-sans text-4xl font-semibold">{value}</div>
      <p className="mt-4 text-sm leading-6 text-[var(--ink)]/70">{detail}</p>
    </article>
  );
}

function analyticsRowsFromEntries(entries: Feedback[]) {
  return [...entries]
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .map((entry) => {
      const sentiment: RecentFeedbackRow["sentiment"] =
        entry.rating === "negative" ? "negative" : entry.rating === "neutral" ? "neutral" : "positive";

      return {
        time: formatTimestamp(entry.createdAt),
        sentiment,
        source: "Feedback API",
        feedback: entry.feedback,
      };
    });
}

function analyticsRowsFromUsageEvents(events: SkillUsageEvent[]) {
  return [...events]
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .slice(0, 12)
    .map((event) => ({
      time: formatTimestamp(event.createdAt),
      event: usageEventLabel(String(event.eventKind || "unknown")),
      source: typeof event.source === "string" ? event.source : "Skillfully",
      detail: typeof event.path === "string" ? event.path : typeof event.versionId === "string" ? event.versionId : "-",
    }));
}

function SkillAnalyticsWorkspace({
  entries,
  usageEvents,
}: {
  entries: Feedback[];
  usageEvents: SkillUsageEvent[];
}) {
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("24h");
  const [sentiments, setSentiments] = useState<Array<RecentFeedbackRow["sentiment"]>>([
    "positive",
    "neutral",
    "negative",
  ]);
  const rows = analyticsRowsFromEntries(entries);
  const counts = ratingSummary(entries);
  const usageCounts = usageSummary(usageEvents);
  const usageRows = analyticsRowsFromUsageEvents(usageEvents);
  const ratedTotal = counts.positive + counts.neutral + counts.negative;
  const positiveRate = ratedTotal > 0 ? `${Math.round((counts.positive / ratedTotal) * 100)}%` : "0%";
  const visibleRows = rows.filter(({ sentiment, source, feedback }) => {
    const matchesSentiment = sentiments.includes(sentiment);
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return matchesSentiment;
    }
    return matchesSentiment && `${source} ${feedback}`.toLowerCase().includes(needle);
  });

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <section className="space-y-6 p-5 sm:p-7">
        <div className="grid gap-4 xl:grid-cols-[minmax(16rem,1fr)_10rem_minmax(20rem,auto)]">
          <label className="flex items-center gap-3 border border-[var(--ink)] bg-[var(--paper)] px-4">
            <SearchIcon />
            <input
              className="w-full bg-transparent py-3 outline-none"
              placeholder="Search feedback"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </label>
          <DashboardSelect
            ariaLabel="Analytics date range"
            value={range}
            options={[
              { value: "24h", label: "Last 24h" },
              { value: "7d", label: "Last 7 days" },
            ]}
            onChange={setRange}
          />
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
          <AnalyticsSummaryCard
            title="Feedback received"
            value={ratedTotal.toLocaleString()}
            detail="Counted from feedback submissions for this skill."
          />
          <AnalyticsSummaryCard
            title="Positive rate"
            value={positiveRate}
            detail="Share of submitted ratings marked positive."
          />
          <AnalyticsSummaryCard
            title="Usage events"
            value={usageEvents.length.toLocaleString()}
            detail="Public page views, update checks, file loads, and feedback events."
          />
          <AnalyticsSummaryCard
            title="Update checks"
            value={(usageCounts.manifest_checked ?? 0).toLocaleString()}
            detail="Manifest reads from agents checking for the latest published version."
          />
        </section>

        <section className={`${DASHBOARD_CARD} overflow-hidden`}>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-editorial-sans text-2xl font-semibold">Runtime events</h2>
            <p className="font-editorial-mono text-xs font-bold uppercase">
              {(usageCounts.file_loaded ?? 0).toLocaleString()} file loads
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead className="font-editorial-mono text-xs uppercase">
                <tr className="border-b border-[var(--ink)]">
                  <th className="px-5 py-4 font-bold">Time (UTC) ↓</th>
                  <th className="px-5 py-4 font-bold">Event</th>
                  <th className="px-5 py-4 font-bold">Source</th>
                  <th className="px-5 py-4 font-bold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {usageRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-[var(--ink)]/65">
                      No runtime events yet.
                    </td>
                  </tr>
                ) : (
                  usageRows.map(({ time, event, source, detail }) => (
                    <tr key={`${time}-${event}-${source}-${detail}`} className="border-b border-[var(--ink)]/45">
                      <td className="px-5 py-4">{time}</td>
                      <td className="px-5 py-4">{event}</td>
                      <td className="px-5 py-4">{source}</td>
                      <td className="px-5 py-4 font-editorial-mono text-xs">{detail}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-[var(--ink)]/65">
                      No feedback yet.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map(({ time, sentiment, source, feedback }) => (
                    <tr key={`${time}-${source}-${feedback}`} className="border-b border-[var(--ink)]/45">
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
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-4 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>Showing {visibleRows.length} of {rows.length}</p>
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
  theme,
  onThemeChange,
  onToggleAccountMenu,
  onOpenAccountSettings,
  onSignOut,
}: {
  user: AppUser;
  isAccountMenuOpen: boolean;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onToggleAccountMenu: () => void;
  onOpenAccountSettings: () => void;
  onSignOut: () => void;
}) {
  const accountName = displayAccountName(user);
  const accountEmail = displayUserEmail(user);

  return (
    <div className="relative flex min-h-16 items-center justify-end gap-5 border-b border-[var(--ink)] bg-[var(--paper)] px-5">
      <button type="button" className="font-editorial-mono text-sm underline">
        Guide
      </button>
      <button
        type="button"
        aria-label="Theme"
        className="text-2xl leading-none"
        onClick={() => {
          const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
          onThemeChange(nextTheme);
        }}
      >
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
  const isGitHubImported = skill.sourceMode === "github_import" && Boolean(skill.originalRepoFullName);
  const sourceRepo = isGitHubImported ? skill.originalRepoFullName : "Skillfully managed repository";
  const publishBehavior = isGitHubImported
    ? "Create pull request on publish"
    : "Publish through the Skillfully-owned skills repository";

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
          <button
            type="button"
            className={`flex items-center gap-3 border px-4 py-4 text-left text-sm ${
              isGitHubImported ? "border-[var(--ink)]/45" : "border-[var(--ink)] bg-[var(--white)]"
            }`}
          >
            <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--ink)]">
              {!isGitHubImported ? <span className="h-2 w-2 rounded-full bg-[var(--ink)]" /> : null}
            </span>
            Managed in Skillfully
          </button>
          <button
            type="button"
            className={`flex items-center gap-3 border px-4 py-4 text-left text-sm ${
              isGitHubImported ? "border-[var(--ink)] bg-[var(--white)]" : "border-[var(--ink)]/45"
            }`}
          >
            <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--ink)]">
              {isGitHubImported ? <span className="h-2 w-2 rounded-full bg-[var(--ink)]" /> : null}
            </span>
            GitHub tracked
          </button>
        </div>
        <SettingsRow label="Repository" value={sourceRepo} />
        <SettingsRow label="Skill path" value={`skills/${slug}`} />
        <SettingsRow label="Default branch" value="Configured by publishing target" />
        <SettingsRow label="Publish behavior" value={publishBehavior} />
        <SettingsRow
          label="Connection status"
          value={<span className="inline-flex items-center gap-3"><span aria-hidden className="h-2 w-2 rounded-full bg-[var(--ink)]" />{isGitHubImported ? "Connected" : "Managed by Skillfully"}</span>}
        />
        {isGitHubImported ? (
          <div className="space-y-4 p-5">
            <button type="button" className={DASHBOARD_BUTTON_LIGHT}>Disconnect GitHub</button>
            <p className="text-sm leading-6 text-[var(--ink)]/65">
              Switching to "Managed in Skillfully" keeps Skillfully as the canonical source without GitHub tracking.
            </p>
          </div>
        ) : null}
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
          label="Manifest endpoint"
          value={<span className="font-editorial-mono">/api/public/skills/{skill.skillId}/manifest</span>}
          action={<button type="button" aria-label="Copy manifest endpoint" className="border border-[var(--ink)] p-3"><CopyIcon /></button>}
        />
        <SettingsRow
          label="Feedback endpoint"
          value={<span className="font-editorial-mono">/feedback/{skill.skillId}</span>}
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
  theme = "system",
  onThemeChange = () => undefined,
  onToggleAccountMenu,
  onOpenAccountSettings,
  onSignOut,
}: {
  user: AppUser;
  isAccountMenuOpen: boolean;
  theme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
  onToggleAccountMenu: () => void;
  onOpenAccountSettings: () => void;
  onSignOut: () => void;
}) {
  const accountName = displayAccountName(user);
  const accountEmail = displayUserEmail(user);

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <AccountTopBar
        user={user}
        isAccountMenuOpen={isAccountMenuOpen}
        theme={theme}
        onThemeChange={onThemeChange}
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
                <span className="inline-grid grid-cols-3 border border-[var(--ink)]">
                  {(["light", "dark", "system"] as const).map((mode) => {
                    const isActive = theme === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        className={`px-6 py-2 text-sm capitalize ${
                          isActive ? "bg-[var(--ink)] text-[var(--paper)]" : ""
                        }`}
                        onClick={() => onThemeChange(mode)}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    );
                  })}
                </span>
              }
            />
            <SettingsRow label="Default landing page" value="Dashboard" action={<span aria-hidden className="text-xl">⌄</span>} />
            <SettingsRow label="Time zone" value="Browser default" action={<span aria-hidden className="text-xl">⌄</span>} />
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
            <SettingsRow label="Sign-in method" value="Email magic code" />
            <SettingsRow label="Active sessions" value="Current session" action={<button type="button" className={DASHBOARD_BUTTON_LIGHT}>View Sessions</button>} />
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
  usageEvents = [],
  user,
  onBack,
  activeTab = "overview",
  onTabChange,
  onOpenEditor,
  feedbackTemplate,
  feedbackTemplateError,
}: {
  skill: Skill;
  entries: Feedback[];
  usageEvents?: SkillUsageEvent[];
  user?: AppUser | null;
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
  const usageCounts = usageSummary(usageEvents);
  const totalUsageEvents = usageEvents.length;
  const updateChecks = usageCounts.manifest_checked ?? 0;
  const fileLoads = usageCounts.file_loaded ?? 0;
  const totalRated = counts.positive + counts.neutral + counts.negative;
  const successRate =
    totalRated > 0 ? `${Math.round((counts.positive / totalRated) * 1000) / 10}%` : "0%";
  const feedbackReceived = totalRated.toLocaleString();
  const statusLabel = skill.status === "published" || skill.publishedVersionId ? "Published" : "Draft";
  const versionLabel = skill.publishedVersionId
    ? "Published version"
    : skill.currentDraftVersionId
      ? "Draft version"
      : "Not versioned";

  if (activeTab === "editor") {
    return <SkillEditorWorkspace skill={skill} user={user} />;
  }

  if (activeTab === "analytics") {
    return <SkillAnalyticsWorkspace entries={entries} usageEvents={usageEvents} />;
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
              {versionLabel}
            </span>
            <span className="border border-emerald-800 bg-emerald-50 px-4 py-3 font-editorial-sans text-sm text-emerald-800">
              {statusLabel}
            </span>
          </div>
          <p className="mt-6 max-w-2xl text-lg leading-8">
            {skill.description || "No description yet."}
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
              captureClientEvent("dashboard_editor_clicked", { skill_name: skill.name });
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
              captureClientEvent("snippet_copied", { skill_name: skill.name, skill_id: skill.skillId });
              setSnippetCopied(true);
              window.setTimeout(() => setSnippetCopied(false), 1200);
            }}
          >
            {snippetCopied ? "Copied" : "Copy installation prompt"}
            <CopyIcon />
          </button>
        </div>
      </header>

      <section className="grid md:grid-cols-3">
        <MetricCard label="Success rate" value={successRate} detail="Based on submitted feedback ratings." />
        <MetricCard label="Feedback received" value={feedbackReceived} detail="Total feedback entries collected for this skill." />
        <MetricCard
          label="Usage events"
          value={totalUsageEvents.toLocaleString()}
          detail={`${pluralCount(updateChecks, "update check")} / ${pluralCount(fileLoads, "file load")}.`}
        />
      </section>

      <UsageChart events={usageEvents} />

      <section className="grid">
        <SentimentPanel entries={entries} />
      </section>

      <RecentFeedbackTable entries={entries} />
      <PublishingStatus />
      <VersionSnapshot skill={skill} />
    </div>
  );
}

export default function Dashboard({
  initialSkillId,
  initialTab = "overview",
  routeName = "index",
}: DashboardRouteProps = {}) {
  const router = useOptionalRouter();
  const { isLoading: isAuthLoading, user, error: authHookError } = db.useAuth();
  const [screen, setScreen] = useState<Screen>("list");
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [isSkillSelectorOpen, setIsSkillSelectorOpen] = useState(false);
  const [isCreateSkillModalOpen, setIsCreateSkillModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const [authPhase, setAuthPhase] = useState<AuthPhase>("request");
  const [authForm, setAuthForm] = useState<AuthForm>({ email: "", code: "" });
  const [pendingEmail, setPendingEmail] = useState("");
  const [hasTrackedCodeEntry, setHasTrackedCodeEntry] = useState(false);

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
      skillUsageEvents: {
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
  const usageEvents = (data?.skillUsageEvents ?? []) as SkillUsageEvent[];

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
  const selectedUsageEvents = useMemo(
    () =>
      selectedSkill
        ? usageEvents.filter((entry) => entry.skillId === selectedSkill.skillId)
        : [],
    [selectedSkill, usageEvents],
  );

  useEffect(() => {
    if (!user || activeTab !== "analytics") {
      return;
    }

    captureClientEvent("analytics_viewed", {
      surface: "dashboard",
      skill_id: selectedSkill?.skillId ?? null,
      skill_name: selectedSkill?.name ?? null,
    });
  }, [activeTab, selectedSkill?.skillId, selectedSkill?.name, user?.id]);

  const shouldShowOnboardingModal =
    screen === "list" &&
    !onboardingDismissed &&
    shouldShowOnboardingModalByDefault({ skills });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "system" ? "light dark" : theme;
  }, [theme]);

  useEffect(() => {
    setOnboardingDismissed(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (initialTab === "account") {
      setActiveTab("account");
      setScreen("list");
      setOnboardingDismissed(true);
      return;
    }

    if (!initialSkillId || skills.length === 0) {
      return;
    }

    const routedSkill =
      skills.find((skill) => skill.id === initialSkillId || skill.skillId === initialSkillId) ?? null;

    if (!routedSkill) {
      return;
    }

    setSelectedSkillId(routedSkill.id);
    setActiveTab(isSkillRouteTab(initialTab) ? initialTab : "overview");
    setScreen("detail");
    setOnboardingDismissed(true);
  }, [initialSkillId, initialTab, skills, user]);

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

          captureClientEvent("auth_email_submitted", { email: normalized, auth_flow: "dashboard" });
          setIsSubmitting(true);
          try {
            await db.auth.sendMagicCode({ email: normalized });
            setPendingEmail(normalized);
            setAuthForm((state) => ({ ...state, email: normalized, code: "" }));
            setHasTrackedCodeEntry(false);
            setAuthPhase("verify");
          } catch (error) {
            captureClientException(error);
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

          captureClientEvent("auth_code_submitted", {
            email: normalized,
            auth_flow: "dashboard",
            code_length: code.length,
          });
          setIsSubmitting(true);
          try {
            const response = await db.auth.signInWithMagicCode({
              email: normalized,
              code,
            });

            if (response.user) {
              identifyClientUser(response.user.id, { email: normalized });
              captureClientEvent("auth_code_verified", { email: normalized, auth_flow: "dashboard" });
              return;
            }

            setErrorMessage("Could not verify code yet. Try again.");
          } catch (error) {
            captureClientException(error);
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
          if (!hasTrackedCodeEntry && value.trim()) {
            captureClientEvent("auth_code_entered", {
              auth_flow: "dashboard",
              code_length: value.trim().length,
            });
            setHasTrackedCodeEntry(true);
          }
          setAuthForm((state) => ({ ...state, code: value }));
        }}
        onCodePaste={() => {
          captureClientEvent("auth_code_pasted", { auth_flow: "dashboard" });
        }}
        onChangeMode={() => {
          setErrorMessage("");
          setAuthPhase("request");
          setAuthForm((state) => ({ ...state, code: "" }));
          setHasTrackedCodeEntry(false);
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
    captureClientEvent("user_signed_out");
    resetClientAnalytics();
    setErrorMessage("");
    setSkillForm({ name: "", description: "" });
    setAuthForm({ email: "", code: "" });
    setAuthPhase("request");
    setHasTrackedCodeEntry(false);
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
    captureClientEvent("dashboard_tab_selected", { tab });
    setOnboardingDismissed(true);
    setErrorMessage("");
    setIsSkillSelectorOpen(false);
    setIsAccountMenuOpen(false);
    setActiveTab(tab);

    if (tab === "account") {
      setScreen("list");
      router.push("/dashboard/settings");
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

    const routeSkill =
      skills.find((skill) => skill.id === selectedSkillId) ?? selectedSkill ?? skills[0];

    if (!selectedSkillId) {
      setSelectedSkillId(routeSkill.id);
    }

    if (isSkillRouteTab(tab)) {
      router.push(skillRoute(routeSkill, tab));
    }
    setScreen("detail");
  }

  async function createSkill(name: string, description: string) {
    if (!user) {
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage("Skill name is required");
      return;
    }

    const cleanDescription = description.trim() || undefined;
    setIsSubmitting(true);

    try {
      let createdSkillId: string;
      let createdEntityId: string;

      if (isUsingLocalPreviewDb) {
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
        createdSkillId = newSkillId;
        createdEntityId = newSkillEntityId;
      } else {
        const response = await dashboardJson<{ skill: Skill }>(user, "/api/dashboard/skills", {
          method: "POST",
          body: JSON.stringify({
            name: cleanName,
            description: cleanDescription,
          }),
        });
        createdSkillId = response.skill.skillId;
        createdEntityId = response.skill.id;
      }

      setSkillForm({ name: "", description: "" });
      setModalSkillForm({ name: "", description: "" });
      setSelectedSkillId(createdEntityId);
      setActiveTab("overview");
      setOnboardingDismissed(true);
      setIsCreateSkillModalOpen(false);
      setIsSkillSelectorOpen(false);
      setScreen("detail");
      setErrorMessage("");
      router.push(`/dashboard/${createdSkillId}/overview`);
    } catch (error) {
      captureClientException(error);
      setErrorMessage(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function createSkillFromModal(name: string, description: string) {
    if (!name.trim()) {
      setErrorMessage("Skill name is required");
      return;
    }

    createSkill(name, description);
  }

  const isEditorSurface = activeTab === "editor" && viewState.kind === "detail";

  return (
    <main
      data-dashboard-route={routeName}
      data-initial-skill-id={initialSkillId}
      data-initial-tab={initialTab}
      className="min-h-screen overflow-x-hidden bg-[var(--paper)] text-[var(--ink)]"
    >
      <div aria-hidden className="marketing-noise" />
      <div
        className={`grid min-h-screen min-w-0 grid-cols-1 transition-opacity lg:h-screen lg:grid-cols-[15rem_minmax(0,1fr)] ${
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
            captureClientEvent("skill_selected", { skill_name: skill.name });
            setSelectedSkillId(skill.id);
            setOnboardingDismissed(true);
            setIsSkillSelectorOpen(false);
            setIsAccountMenuOpen(false);
            setScreen("detail");
            setErrorMessage("");
            router.push(skillRoute(skill, isSkillRouteTab(activeTab) ? activeTab : "overview"));
          }}
          onTabChange={openDashboardTab}
          onToggleSkillSelector={() => {
            setIsSkillSelectorOpen((current) => !current);
            setIsAccountMenuOpen(false);
          }}
          onOpenCreateSkill={openCreateSkillModal}
          onSignOut={handleSignOut}
        />

        <section className={`min-w-0 ${isEditorSurface ? "lg:h-screen lg:overflow-hidden" : "lg:h-screen lg:overflow-y-auto"}`}>
          {activeTab === "account" ? (
            <AccountSettingsWorkspace
              user={user}
              isAccountMenuOpen={isAccountMenuOpen}
              theme={theme}
              onThemeChange={setTheme}
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
              usageEvents={selectedUsageEvents}
              user={user}
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
            captureClientEvent("onboarding_modal_closed");
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
