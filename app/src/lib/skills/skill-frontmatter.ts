export const DEFAULT_SKILL_DESCRIPTION = "Describe when and how agents should use this skill.";
export const AGENT_SKILLS_SPEC_URL = "https://agentskills.io/specification";

const MAX_SKILL_SPEC_NAME_LENGTH = 64;
const MAX_SKILL_SPEC_DESCRIPTION_LENGTH = 1024;

type SkillFrontmatter = {
  name?: string;
  description?: string;
};

export type SkillMarkdownValidation =
  | { valid: true; name: string; description: string }
  | { valid: false; reason: string; name?: string; description?: string };

export class SkillFrontmatterValidationError extends Error {
  constructor(reason: string) {
    super(`Invalid SKILL.md: ${reason}. See ${AGENT_SKILLS_SPEC_URL}`);
    this.name = "SkillFrontmatterValidationError";
  }
}

export function skillSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "skill"
  );
}

export function skillSpecName(value: string) {
  return skillSlug(value).slice(0, MAX_SKILL_SPEC_NAME_LENGTH).replace(/-+$/g, "") || "skill";
}

function yamlQuotedString(value: string) {
  return JSON.stringify(value.replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
}

export function buildSkillMarkdown({
  name,
  description,
  body = "",
}: {
  name: string;
  description?: string | null;
  body?: string;
}) {
  const frontmatter = [
    "---",
    `name: ${skillSpecName(name)}`,
    `description: ${yamlQuotedString(description?.trim() || DEFAULT_SKILL_DESCRIPTION)}`,
    "---",
  ].join("\n");
  const editableBody = body.replace(/^\r?\n+/, "");

  return editableBody ? `${frontmatter}\n\n${editableBody}` : `${frontmatter}\n`;
}

function frontmatterMatch(markdown: string) {
  return markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
}

export function extractSkillMarkdownBody(markdown: string) {
  const match = frontmatterMatch(markdown);
  if (!match) {
    return markdown;
  }

  return markdown.slice(match[0].length).replace(/^\r?\n/, "");
}

function parseYamlScalar(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return String(JSON.parse(trimmed));
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

export function parseSkillMarkdownFrontmatter(markdown: string): SkillFrontmatter {
  const match = frontmatterMatch(markdown);
  if (!match) {
    return {};
  }

  const frontmatter: SkillFrontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) {
      continue;
    }
    const key = field[1];
    const value = parseYamlScalar(field[2] ?? "");
    if (key === "name") {
      frontmatter.name = value;
    }
    if (key === "description") {
      frontmatter.description = value;
    }
  }

  return frontmatter;
}

function isValidSkillSpecName(value: string) {
  return (
    value.length > 0 &&
    value.length <= MAX_SKILL_SPEC_NAME_LENGTH &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value) &&
    !value.includes("--")
  );
}

export function validateSkillMarkdown({
  markdown,
  expectedName,
}: {
  markdown: string;
  expectedName?: string | null;
}): SkillMarkdownValidation {
  const match = frontmatterMatch(markdown);
  if (!match) {
    return { valid: false, reason: "SKILL.md must include YAML frontmatter" };
  }

  const frontmatter = parseSkillMarkdownFrontmatter(markdown);
  const name = frontmatter.name?.trim() ?? "";
  if (!name) {
    return { valid: false, reason: "name is required" };
  }
  if (name.length > MAX_SKILL_SPEC_NAME_LENGTH) {
    return { valid: false, reason: "name must be 64 characters or fewer", name };
  }
  if (!isValidSkillSpecName(name)) {
    return {
      valid: false,
      reason: "name must use lowercase letters, numbers, and hyphens only",
      name,
    };
  }

  const normalizedExpectedName = expectedName?.trim();
  if (normalizedExpectedName && name !== normalizedExpectedName) {
    return {
      valid: false,
      reason: `name must match package directory \`${normalizedExpectedName}\``,
      name,
    };
  }

  const description = frontmatter.description?.trim() ?? "";
  if (!description) {
    return { valid: false, reason: "description is required", name };
  }
  if (description.length > MAX_SKILL_SPEC_DESCRIPTION_LENGTH) {
    return {
      valid: false,
      reason: "description must be 1024 characters or fewer",
      name,
      description,
    };
  }

  return { valid: true, name, description };
}

export function assertValidSkillMarkdown({
  markdown,
  expectedName,
}: {
  markdown: string;
  expectedName?: string | null;
}) {
  const validation = validateSkillMarkdown({ markdown, expectedName });
  if (!validation.valid) {
    throw new SkillFrontmatterValidationError(validation.reason);
  }
  return validation;
}
