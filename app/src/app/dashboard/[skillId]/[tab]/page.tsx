import { use } from "react";
import Dashboard from "../../page";

type SkillDashboardParams = {
  skillId: string;
  tab: string;
};

export default function SkillDashboardRoute({
  params,
}: {
  params: SkillDashboardParams | Promise<SkillDashboardParams>;
}) {
  const resolvedParams =
    typeof (params as Promise<SkillDashboardParams>).then === "function"
      ? use(params as Promise<SkillDashboardParams>)
      : (params as SkillDashboardParams);

  return (
    <Dashboard
      initialSkillId={resolvedParams.skillId}
      initialTab={routeTab(resolvedParams.tab)}
      routeName="skill-tab"
    />
  );
}

function routeTab(tab: string) {
  if (tab === "editor" || tab === "analytics" || tab === "settings") {
    return tab;
  }

  return "overview";
}
