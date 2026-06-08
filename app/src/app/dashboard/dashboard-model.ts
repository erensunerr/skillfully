import type { BrandedSelectOption } from "@/components/branded-select";
import { type AppSchema } from "@/instant.schema";
import type { User as InstantUser } from "@instantdb/core";
import { type InstaQLEntity } from "@instantdb/react";
import { isUsingLocalPreviewDb } from "@/lib/db";
import { isPrimarySkillMarkdownPath } from "@/lib/skills/managed-block";
import {
  DEFAULT_SKILL_DESCRIPTION,
  buildSkillMarkdown,
  parseSkillMarkdownFrontmatter,
  skillSpecName,
} from "@/lib/skills/skill-frontmatter";
import { buildUserSkillInstallPrompt } from "@/lib/skills/install-prompts";
import type { GitHubImportCandidateView } from "./github-import-modal";

export type SkillAccessLevel = "owner" | "edit" | "use";
export type Skill = InstaQLEntity<AppSchema, "skills"> & {
  accessLevel?: SkillAccessLevel;
  ownerEmail?: string | null;
  anyoneWithLinkCanUse?: boolean | null;
  linkUseToken?: string | null;
};
export type Feedback = InstaQLEntity<AppSchema, "feedback">;
export type SkillUsageEvent = InstaQLEntity<AppSchema, "skillUsageEvents">;
export type AppUser = InstantUser;
export type Screen = "list" | "create" | "detail";
export type DashboardTab = "overview" | "editor" | "analytics" | "settings" | "account";
export type SkillRouteTab = Exclude<DashboardTab, "account">;
export type AuthPhase = "request" | "verify";
export type ThemeMode = "light" | "dark" | "system";

export type AuthForm = {
  email: string;
  code: string;
};

export type SkillForm = {
  name: string;
  description: string;
};

export type ActivationMode = "template" | "generate";

export type ActivationForm = {
  name: string;
  audience: string;
  job: string;
  examplePrompt: string;
};

export type DashboardRouteProps = {
  initialSkillId?: string;
  initialTab?: DashboardTab;
  routeName?: string;
};

export type SelectOption = BrandedSelectOption;

export type MdxMarkdownEditorProps = {
  markdown: string;
  onChange: (markdown: string) => void;
};

export type RecentFeedbackRow = {
  sentiment: "positive" | "neutral" | "negative";
  rating: string;
  feedback: string;
  createdAt: string;
};
export type UsageEventKind =
  | "public_page_view"
  | "skill_installed"
  | "manifest_checked"
  | "file_loaded"
  | "feedback_received"
  | string;

export type PublishModalStep = "confirm" | "merge" | "published" | "waiting" | "confirmed";
export type SkillEditorFile = {
  id: string;
  path: string;
  kind: string;
  mimeType?: string | null;
  contentText?: string | null;
  storageUrl?: string | null;
  updatedAt?: number | null;
};
export type GitHubImportCandidatesResponse = {
  candidates: GitHubImportCandidateView[];
  warnings?: string[];
  repositories?: string[];
};
export type GitHubImportSubmitResponse = {
  imported: Array<{
    candidate_id?: string;
    skill_id: string;
    entity_id?: string;
    name: string;
  }>;
  failures?: GitHubImportFailureView[];
  candidates?: GitHubImportCandidateView[];
  error?: string;
};
export type GitHubImportFailureView = { candidate_id?: string; name?: string; error: string };
export type GitHubInstallStartResponse = {
  install_url?: string;
  session_id?: string;
  account_login?: string;
};
export type PublishApiResult = {
  results: Array<{ targetKind: string; status: string; url?: string; error?: string }>;
  next_action?: {
    type?: string;
    pull_request_url?: string;
    install_prompt?: string;
  };
};
export type SkillAccessGrantView = {
  id: string;
  email: string;
  user_id: string | null;
  permission: "use" | "edit";
  status: string;
  is_owner: boolean;
  can_revoke: boolean;
  created_at: number;
  updated_at: number;
  revoked_at: number | null;
};

export function applyGitHubImportFailuresToCandidates({
  candidates,
  selectedCandidateIds,
  failures,
}: {
  candidates: GitHubImportCandidateView[];
  selectedCandidateIds: Set<string>;
  failures: GitHubImportFailureView[];
}) {
  const nextCandidates = candidates.map((candidate) => {
    const failure = failures.find((entry) =>
      entry.candidate_id === candidate.id ||
      (!entry.candidate_id && entry.name === candidate.skillName),
    );
    if (!failure) {
      return candidate;
    }

    return {
      ...candidate,
      status: "invalid" as const,
      reason: failure.error,
    };
  });
  const validCandidateIds = new Set(
    nextCandidates
      .filter((candidate) => candidate.status === "valid")
      .map((candidate) => candidate.id),
  );

  return {
    candidates: nextCandidates,
    selectedCandidateIds: new Set(
      [...selectedCandidateIds].filter((candidateId) => validCandidateIds.has(candidateId)),
    ),
  };
}

export const DASHBOARD_CARD = "border border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)]";
export const DASHBOARD_PANEL = "border border-[var(--ink)] bg-[var(--white)] text-[var(--ink)]";
export const DASHBOARD_BUTTON =
  "editorial-button editorial-button-dark px-4 py-3 text-[0.72rem]";
export const DASHBOARD_BUTTON_LIGHT =
  "editorial-button bg-[var(--paper)] px-4 py-3 text-[0.72rem] hover:bg-[var(--white)]";
export const DASHBOARD_INPUT =
  "mt-2 w-full border border-[var(--ink)] bg-[var(--white)] px-3 py-3 font-editorial-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]";
export const SKILLS_GUIDE_PATH = "/guide/start-with-agent-skills";

export const validSkillRouteTabs: SkillRouteTab[] = ["overview", "editor", "analytics", "settings"];

export const publicPublishingDestinationRows = [
  ["Skillfully", "Available after publish", "Public manifest and Skillfully listing", "terminal"],
  ["GitHub", "Creates a PR for GitHub-managed skills", "Uses the imported source repository", "github"],
  ["LobeHub Skills", "Generates a submission packet", "Manual directory adapter", "circle"],
  ["ClawHub", "Generates a submission packet", "Manual directory adapter", "triangle"],
  ["Hermes Skills Hub", "Generates a submission packet", "Manual directory adapter", "square"],
] satisfies Array<[string, string, string, string]>;

export const permissionSelectOptions = [
  { value: "use", label: "Use" },
  { value: "edit", label: "Edit" },
] satisfies SelectOption[];

export function normalizePermission(value: string): "use" | "edit" {
  return value === "edit" ? "edit" : "use";
}

export function skillVisibility(skill: Pick<Skill, "visibility">): "private" | "public" {
  return skill.visibility === "public" ? "public" : "private";
}

export function publishingDestinationRowsForSkill(skill: Pick<Skill, "visibility" | "anyoneWithLinkCanUse">) {
  if (skillVisibility(skill) === "private") {
    const linkUseEnabled = skill.anyoneWithLinkCanUse === true;
    return [
      [
        "Skillfully",
        linkUseEnabled ? "Private link-use release" : "Private Skillfully release",
        linkUseEnabled
          ? "Anyone with the link can install published versions"
          : "Only people with use or edit access can install published versions",
        "terminal",
      ],
    ] satisfies Array<[string, string, string, string]>;
  }

  return publicPublishingDestinationRows;
}

export function pathSegments(path: string) {
  return path.split("/").filter(Boolean);
}

export function skillPackageFrontmatterName(skill: Skill) {
  if (skill.sourceMode === "github_import" && skill.originalSkillPath) {
    return pathSegments(skill.originalSkillPath).at(-1) || skillSpecName(skill.name);
  }

  return skill.slug || skillSpecName(skill.name);
}

export function defaultEditorMarkdown(skill: Skill) {
  return buildSkillMarkdown({
    name: skillPackageFrontmatterName(skill),
    description: skill.description?.trim() || DEFAULT_SKILL_DESCRIPTION,
  });
}

export function fallbackEditorFiles(skill: Skill): SkillEditorFile[] {
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

export function isMarkdownFilePath(path: string | null | undefined) {
  const lower = (path ?? "").toLowerCase();
  return lower === "skill.md" || lower.endsWith(".md") || lower.endsWith(".mdx");
}

export function isEditableSkillFile(file: { path?: string | null; kind?: string | null; mimeType?: string | null }) {
  const mimeType = file.mimeType?.toLowerCase() ?? "";
  return (
    file.kind === "markdown" ||
    mimeType === "text/markdown" ||
    mimeType === "text/mdx" ||
    mimeType === "application/mdx" ||
    isMarkdownFilePath(file.path)
  );
}

export function sortSkillFiles(files: SkillEditorFile[]) {
  return [...files].sort((a, b) => a.path.localeCompare(b.path));
}

export function markdownFilePathFromInput(value: string) {
  const cleanPath = value.trim().replace(/^\/+/, "");
  if (!cleanPath) {
    return "";
  }
  return isMarkdownFilePath(cleanPath) ? cleanPath : `${cleanPath}.md`;
}

export function frontmatterStateFromFiles(skill: Skill, files: SkillEditorFile[]) {
  const primarySkillFile = files.find((file) => isPrimarySkillMarkdownPath(file.path));
  const parsed = primarySkillFile?.contentText
    ? parseSkillMarkdownFrontmatter(primarySkillFile.contentText)
    : {};

  return {
    name: skillPackageFrontmatterName(skill),
    summary: parsed.description || skill.description?.trim() || DEFAULT_SKILL_DESCRIPTION,
  };
}

export function skillSettingsPublishingRows(isGitHubImported: boolean, visibility: "private" | "public") {
  if (visibility === "private") {
    return [
      [
        "Skillfully",
        "Private Skillfully release",
        "Configured",
        "terminal",
        "bg-emerald-700",
      ],
    ] satisfies Array<[string, string, string, string, string]>;
  }

  return [
    ["Skillfully", "Publish to everyone", "Configured", "terminal", "bg-emerald-700"],
    [
      "GitHub",
      isGitHubImported ? "Create PR on publish" : "Only for GitHub-managed skills",
      isGitHubImported ? "Configured" : "Not used",
      "github",
      isGitHubImported ? "bg-emerald-700" : "bg-[var(--ink)]/35",
    ],
    ["LobeHub Skills", "Manual submission packet", "Configured", "circle", "bg-emerald-700"],
    ["ClawHub", "Manual submission packet", "Configured", "triangle", "bg-emerald-700"],
    ["Hermes Skills Hub", "Manual submission packet", "Configured", "square", "bg-emerald-700"],
  ] satisfies Array<[string, string, string, string, string]>;
}

export function randomSkillId() {
  const chars = "abcdefghijkmnopqrstuvwxyz23456789";
  let out = "sk_";
  for (let i = 0; i < 10; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function toMillis(value: number | Date | null | undefined) {
  if (typeof value === "number") {
    return value;
  }
  return value instanceof Date ? value.getTime() : 0;
}

export function ratingSummary(feedback: Feedback[]) {
  return {
    positive: feedback.filter((entry) => entry.rating === "positive").length,
    negative: feedback.filter((entry) => entry.rating === "negative").length,
    neutral: feedback.filter((entry) => entry.rating === "neutral").length,
  };
}

export function usageSummary(events: SkillUsageEvent[]) {
  return events.reduce<Record<UsageEventKind, number>>((acc, event) => {
    const kind = String(event.eventKind || "unknown");
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  }, {});
}

export function hasInstallationConfirmation(
  events: Array<{ eventKind?: string | null; createdAt?: number | Date | null }>,
  startedAt: number | null,
) {
  if (!startedAt) {
    return false;
  }

  return events.some((event) => {
    if (event.eventKind !== "skill_installed" && event.eventKind !== "feedback_received") {
      return false;
    }

    const createdAt = toMillis(event.createdAt);
    return Boolean(createdAt && createdAt >= startedAt);
  });
}

export function usageEventLabel(kind: UsageEventKind) {
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

export function pluralCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

export function usageEventsByDay(events: SkillUsageEvent[], days = 7) {
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

export function displayUserEmail(user: AppUser | null | undefined) {
  return user?.email || "authenticated user";
}

export function displayAccountName(user: AppUser | null | undefined) {
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

export function skillInitials(name: string) {
  const parts = name.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
    : `${name[0] ?? "S"}${name[1] ?? "K"}`;

  return initials.toUpperCase();
}

export function slugifySkillName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "skill";
}

export function formatTimestamp(value: number | Date | null | undefined) {
  const millis = toMillis(value);
  if (!millis) {
    return "Unknown";
  }

  return `${new Date(millis).toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

export function isSkillRouteTab(value: string | null | undefined): value is SkillRouteTab {
  return validSkillRouteTabs.includes(value as SkillRouteTab);
}

export function skillAccessLevel(skill: Pick<Skill, "accessLevel"> | null | undefined): SkillAccessLevel {
  return skill?.accessLevel ?? "owner";
}

export function isSharedSkill(skill: Pick<Skill, "accessLevel"> | null | undefined) {
  return skillAccessLevel(skill) !== "owner";
}

export function skillAccessLabel(skill: Pick<Skill, "accessLevel"> | null | undefined) {
  const level = skillAccessLevel(skill);
  if (level === "use") {
    return "Use only";
  }
  if (level === "edit") {
    return "Edit access";
  }
  return "Owner";
}

export function canEditSkill(skill: Pick<Skill, "accessLevel"> | null | undefined) {
  return skillAccessLevel(skill) !== "use";
}

export function skillRoute(skill: Skill, tab: SkillRouteTab) {
  return `/dashboard/${skill.skillId || skill.id}/${tab}`;
}

export function gettingStartedRoute() {
  return "/dashboard/getting-started";
}

export function activationSummary(form: ActivationForm) {
  return [form.audience.trim(), form.job.trim()].filter(Boolean).join(" · ");
}

export function buildActivationBody(mode: ActivationMode, form: ActivationForm) {
  const audience = form.audience.trim() || "the target audience";
  const job = form.job.trim() || "the job this skill should handle";
  const examplePrompt = form.examplePrompt.trim() || "Add one real task this skill should help with.";
  const intro =
    mode === "template"
      ? "## Who this skill helps\n- Audience: " + audience + "\n\n## What it should do\n- Job: " + job
      : "## Goal\nHelp " + audience + " with this job:\n- " + job;

  return [
    intro,
    "## Workflow",
    "1. Understand the user's request and confirm the exact output they need.",
    "2. Ask only for missing context that blocks a strong answer.",
    "3. Produce the deliverable directly and keep the response practical.",
    "## Example task",
    examplePrompt,
    "## Notes to improve",
    "- Add your preferred tone, constraints, and output format.",
    "- Replace this example with 2-3 real prompts from users.",
  ].join("\n\n");
}

export function activationChecklistItems({
  skill,
  summary,
  body,
}: {
  skill: Skill;
  summary: string;
  body: string;
}) {
  return [
    {
      label: "Name your skill",
      done: Boolean(skill.name.trim()),
    },
    {
      label: "Add a one-line summary",
      done: Boolean(summary.trim()) && summary.trim() !== DEFAULT_SKILL_DESCRIPTION,
    },
    {
      label: "Write instructions in SKILL.md",
      done: body.trim().length >= 120,
    },
    {
      label: "Publish your first version",
      done: Boolean(skill.publishedVersionId || skill.status === "published"),
    },
  ];
}

export function pushDashboardPath(router: { push: (path: string) => void }, path: string) {
  if (typeof window === "undefined") {
    router.push(path);
    return;
  }

  window.history.pushState(null, "", path);
}

export function dashboardAuthHeaders(user: AppUser, contentType: string | null = "application/json") {
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

export async function dashboardJson<T>(user: AppUser, path: string, init: RequestInit = {}) {
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

export async function dashboardFormData<T>(user: AppUser, path: string, body: FormData, init: RequestInit = {}) {
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

export function extractErrorMessage(error: unknown) {
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

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function buildPublicInstallPrompt(skill: Skill) {
  const isGitHubManaged = skill.sourceMode === "github_import";
  return buildUserSkillInstallPrompt({
    name: skill.name,
    slug: skill.slug,
    skillId: skill.skillId,
    linkUseToken: skillVisibility(skill) === "private" && skill.anyoneWithLinkCanUse === true
      ? skill.linkUseToken
      : null,
    repoFullName: isGitHubManaged && typeof skill.originalRepoFullName === "string"
      ? skill.originalRepoFullName
      : null,
    skillRoot: isGitHubManaged && typeof skill.originalSkillPath === "string"
      ? skill.originalSkillPath
      : null,
  });
}
