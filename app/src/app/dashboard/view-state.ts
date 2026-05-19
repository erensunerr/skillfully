export type DashboardScreen = "list" | "create" | "detail";

export type DashboardSkillRef = {
  id: string;
  accessLevel?: "owner" | "edit" | "use";
};

export type DashboardSkillTab = "overview" | "editor" | "analytics" | "settings" | "account";

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

export function canOpenSkillTab<T extends DashboardSkillRef>(
  skill: T | null | undefined,
  tab: DashboardSkillTab,
) {
  if (!skill || tab === "account" || tab === "overview") {
    return true;
  }

  return skill.accessLevel !== "use";
}

export function resolveDashboardTabForSkill<T extends DashboardSkillRef>(
  skill: T | null | undefined,
  tab: DashboardSkillTab,
) {
  return canOpenSkillTab(skill, tab) ? tab : "overview";
}
