export const DEFAULT_SKILL_DESCRIPTION = "Describe when and how agents should use this skill.";

const MAX_SKILL_SPEC_NAME_LENGTH = 64;

export type SkillFrontmatter = {
  name?: string;
  description?: string;
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

export function skillSpecName(value: string) {
  return skillSlug(value).slice(0, MAX_SKILL_SPEC_NAME_LENGTH).replace(/-+$/g, "") || "skill";
}

export function yamlQuotedString(value: string) {
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
