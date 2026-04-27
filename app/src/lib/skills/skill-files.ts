import crypto from "node:crypto";

import {
  appendSkillfullyManagedBlock,
  isPrimarySkillMarkdownPath,
  skillfullyFeedbackUrl,
  skillfullyManifestUrl,
  stripSkillfullyManagedBlock,
} from "./managed-block";

export type SkillFileKind = "markdown" | "asset" | "json" | "text";

export type ManifestSkill = {
  skillId: string;
  name: string;
  slug: string;
  description?: string | null;
};

export type ManifestVersion = {
  id: string;
  version: string;
  status: string;
};

export type ManifestFile = {
  id: string;
  path: string;
  kind: SkillFileKind | string;
  contentText?: string | null;
  storageUrl?: string | null;
};

export function skillSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "skill"
  );
}

export function normalizeSkillFilePath(value: string) {
  const normalized = value
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");

  if (
    !normalized ||
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized.endsWith("/..") ||
    normalized.split("/").some((part) => part === "." || part === "..") ||
    normalized.startsWith(".")
  ) {
    throw new Error("invalid skill file path");
  }

  return normalized;
}

export function createDefaultSkillFile({
  name,
  description,
}: {
  name: string;
  description?: string | null;
  feedbackUrl?: string;
}) {
  const summary = description?.trim() || "Describe when and how agents should use this skill.";

  return {
    path: "SKILL.md",
    kind: "markdown" as const,
    contentText: [
      `# ${name}`,
      "",
      summary,
      "",
      "## When to use",
      "",
      "- Use this skill when the agent needs the workflow described above.",
      "",
      "## Workflow",
      "",
      "1. Understand the user's goal.",
      "2. Follow the instructions in this skill.",
      "3. Verify the result before responding.",
    ].join("\n"),
  };
}

function hashText(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function buildSkillManifest({
  skill,
  version,
  files,
  baseUrl,
}: {
  skill: ManifestSkill;
  version: ManifestVersion;
  files: ManifestFile[];
  baseUrl?: string | null;
}) {
  return {
    skill_id: skill.skillId,
    name: skill.name,
    slug: skill.slug,
    description: skill.description ?? null,
    feedback_url: skillfullyFeedbackUrl({ skillId: skill.skillId, baseUrl }),
    manifest_url: skillfullyManifestUrl({ skillId: skill.skillId, baseUrl }),
    version_id: version.id,
    version: version.version,
    status: version.status,
    generated_at: new Date(0).toISOString(),
    files: files.map((file) => {
      const rawContent = file.contentText ?? "";
      const content =
        file.contentText !== undefined && isPrimarySkillMarkdownPath(file.path)
          ? appendSkillfullyManagedBlock(rawContent, { skillId: skill.skillId, baseUrl })
          : rawContent;
      return {
        id: file.id,
        path: normalizeSkillFilePath(file.path),
        kind: file.kind,
        sha256: hashText(content || file.storageUrl || file.path),
        url: file.storageUrl ?? null,
      };
    }),
  };
}

export function insertSkillfullyExcerpt(
  content: string,
  {
    feedbackUrl,
    allowAnalyticsExcerpt,
    skillId,
    baseUrl,
  }: {
    feedbackUrl: string;
    allowAnalyticsExcerpt: boolean;
    skillId?: string;
    baseUrl?: string | null;
  },
) {
  if (!allowAnalyticsExcerpt) {
    throw new Error("author consent is required before adding Skillfully excerpts");
  }

  const resolvedSkillId = skillId ?? feedbackUrl.split("/").filter(Boolean).pop() ?? "unknown";
  return appendSkillfullyManagedBlock(content, {
    skillId: resolvedSkillId,
    baseUrl: baseUrl ?? feedbackUrl.replace(/\/feedback\/[^/]+\/?$/, ""),
  });
}

export {
  appendSkillfullyManagedBlock,
  buildSkillfullyManagedBlock,
  isPrimarySkillMarkdownPath,
  skillfullyFeedbackUrl,
  skillfullyFileUrl,
  skillfullyManifestUrl,
  stripSkillfullyManagedBlock,
} from "./managed-block";
