const DEFAULT_USER_SKILLS_REPO = "erensunerr/skillfully-skills";
const SKILLFULLY_REPO = "erensunerr/skillfully";

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
  const resolvedRepoFullName = repoFullName?.trim() || DEFAULT_USER_SKILLS_REPO;
  const resolvedSkillRoot = skillRoot?.trim() || `skills/${slug || name}`;

  return [
    `Install ${name} from ${resolvedRepoFullName} on github.`,
    `Skill path: ${resolvedSkillRoot}`,
    "",
    "When the install is done, call:",
    `POST https://www.skillfully.sh/api/public/skills/${skillId}/install`,
    "",
    "Before each use, check for the latest version:",
    `Manifest URL: https://www.skillfully.sh/api/public/skills/${skillId}/manifest`,
    "",
    "Then load the published files from the manifest and use the latest SKILL.md as your operating instructions.",
  ].join("\n");
}
