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
