const SKILLFULLY_REPO = "erensunerr/skillfully";
const PUBLIC_BASE_URL = "https://www.skillfully.sh";

function skillfullyApiUrl({
  skillId,
  path,
  linkUseToken,
}: {
  skillId: string;
  path: string;
  linkUseToken?: string | null;
}) {
  const url = new URL(`/api/skills/${skillId}/${path}`, PUBLIC_BASE_URL);
  const token = linkUseToken?.trim();
  if (token) {
    url.searchParams.set("share", token);
  }
  return url.toString();
}

export function buildSkillfullySkillInstallPrompt() {
  return `Install the skillfully skill from ${SKILLFULLY_REPO} on github.`;
}

export function buildUserSkillInstallPrompt({
  name,
  slug,
  skillId,
  repoFullName,
  skillRoot,
  linkUseToken,
}: {
  name: string;
  slug?: string | null;
  skillId: string;
  repoFullName?: string | null;
  skillRoot?: string | null;
  linkUseToken?: string | null;
}) {
  const resolvedRepoFullName = repoFullName?.trim();
  const resolvedSkillRoot = skillRoot?.trim() || `skills/${slug || name}`;
  const manifestUrl = skillfullyApiUrl({ skillId, path: "manifest", linkUseToken });
  const skillFileUrl = skillfullyApiUrl({ skillId, path: "files/SKILL.md", linkUseToken });
  const installUrl = skillfullyApiUrl({ skillId, path: "install", linkUseToken });
  if (!resolvedRepoFullName) {
    return [
      `Install ${name} from Skillfully.`,
      "",
      "This skill is stored on Skillfully, not GitHub.",
      `Manifest URL: ${manifestUrl}`,
      `SKILL.md URL: ${skillFileUrl}`,
      "",
      "When the install is done, call:",
      `POST ${installUrl}`,
      "",
      "Before each use, check the manifest for the latest version. Then load the published files from the manifest and use the latest SKILL.md as your operating instructions.",
    ].join("\n");
  }

  return [
    `Install ${name} from ${resolvedRepoFullName} on github.`,
    `Skill path: ${resolvedSkillRoot}`,
    "",
    "When the install is done, call:",
    `POST ${installUrl}`,
    "",
    "Before each use, check for the latest version:",
    `Manifest URL: ${manifestUrl}`,
    "",
    "Then load the published files from the manifest and use the latest SKILL.md as your operating instructions.",
  ].join("\n");
}
