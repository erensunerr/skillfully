export type DashboardScreen = "list" | "create" | "detail";

export type DashboardSkillRef = {
  id: string;
};

export type DashboardViewState =
  | { kind: "create" }
  | { kind: "empty" }
  | { kind: "detail"; skillId: string };

export function resolveDashboardViewState<T extends DashboardSkillRef>({
  screen,
  skills,
  selectedSkillId,
}: {
  screen: DashboardScreen;
  skills: T[];
  selectedSkillId: string | null;
}): DashboardViewState {
  if (screen === "create") {
    return { kind: "create" };
  }

  if (skills.length === 0) {
    return { kind: "empty" };
  }

  const selectedSkill = skills.find((skill) => skill.id === selectedSkillId) ?? skills[0];

  return {
    kind: "detail",
    skillId: selectedSkill.id,
  };
}

export function shouldShowOnboardingModalByDefault<T extends DashboardSkillRef>({
  skills,
}: {
  skills: T[];
}) {
  return skills.length === 0;
}

export function githubConnectionStatusMessage({
  status,
  hasImportSession,
}: {
  status: string | null;
  hasImportSession: boolean;
}) {
  if (!status) {
    return "";
  }

  if (status === "installed") {
    return hasImportSession
      ? ""
      : "GitHub connected, but Skillfully could not start an import session. Connect GitHub again.";
  }

  switch (status) {
    case "unauthorized":
      return "GitHub connected, but Skillfully could not match it to your signed-in session. Sign in and connect GitHub again.";
    case "invalid_state":
      return "GitHub connection could not be verified. Connect GitHub again.";
    case "missing_installation":
      return "GitHub did not return an installation. Connect GitHub again.";
    case "not_configured":
      return "GitHub import is not configured for this environment.";
    case "owner_conflict":
      return "This GitHub installation is already connected to another Skillfully account.";
    case "install_failed":
      return "GitHub connected, but Skillfully could not inspect the installation. Connect GitHub again.";
    default:
      return "";
  }
}
