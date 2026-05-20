const SKILLFULLY_REPO = "erensunerr/skillfully";
const PUBLIC_BASE_URL = "https://www.skillfully.sh";

export function buildSkillfullySkillInstallPrompt() {
  return `Install the skillfully skill from ${SKILLFULLY_REPO} on github.`;
}

export function buildUserSkillInstallPrompt({
  name,
  slug,
  skillId,
  repoFullName,
  skillRoot,
}: {
  name: string;
  slug?: string | null;
  skillId: string;
  repoFullName?: string | null;
  skillRoot?: string | null;
}) {
  const resolvedRepoFullName = repoFullName?.trim();
  const resolvedSkillRoot = skillRoot?.trim() || `skills/${slug || name}`;
  if (!resolvedRepoFullName) {
    return [
      `Install ${name} from Skillfully.`,
      "",
      "This skill is stored on Skillfully, not GitHub.",
      `Manifest URL: ${PUBLIC_BASE_URL}/api/skills/${skillId}/manifest`,
      `SKILL.md URL: ${PUBLIC_BASE_URL}/api/skills/${skillId}/files/SKILL.md`,
      "",
      "When the install is done, call:",
      `POST ${PUBLIC_BASE_URL}/api/skills/${skillId}/install`,
      "",
      "Before each use, check the manifest for the latest version. Then load the published files from the manifest and use the latest SKILL.md as your operating instructions.",
    ].join("\n");
  }

  return [
    `Install ${name} from ${resolvedRepoFullName} on github.`,
    `Skill path: ${resolvedSkillRoot}`,
    "",
    "When the install is done, call:",
    `POST ${PUBLIC_BASE_URL}/api/skills/${skillId}/install`,
    "",
    "Before each use, check for the latest version:",
    `Manifest URL: ${PUBLIC_BASE_URL}/api/skills/${skillId}/manifest`,
    "",
    "Then load the published files from the manifest and use the latest SKILL.md as your operating instructions.",
  ].join("\n");
}
