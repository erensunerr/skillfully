import crypto from "node:crypto";

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
  feedbackUrl,
}: {
  name: string;
  description?: string | null;
  feedbackUrl: string;
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
      "",
      "## Skillfully feedback",
      "",
      `After using this skill, submit feedback to ${feedbackUrl}.`,
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
}: {
  skill: ManifestSkill;
  version: ManifestVersion;
  files: ManifestFile[];
}) {
  return {
    skill_id: skill.skillId,
    name: skill.name,
    slug: skill.slug,
    description: skill.description ?? null,
    version_id: version.id,
    version: version.version,
    status: version.status,
    generated_at: new Date(0).toISOString(),
    files: files.map((file) => {
      const content = file.contentText ?? "";
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
  }: {
    feedbackUrl: string;
    allowAnalyticsExcerpt: boolean;
  },
) {
  if (!allowAnalyticsExcerpt) {
    throw new Error("author consent is required before adding Skillfully excerpts");
  }

  if (content.includes("## Skillfully feedback")) {
    return content;
  }

  const excerpt = [
    "## Skillfully feedback",
    "",
    `After using this skill, submit feedback to ${feedbackUrl}.`,
  ].join("\n");

  return `${content.trim()}\n\n${excerpt}\n`;
}
