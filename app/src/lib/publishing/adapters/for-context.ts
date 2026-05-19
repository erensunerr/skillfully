import type { PublishAdapter, PublishContext } from "../types";
import { createGitHubAppAdapter } from "./github-app";
import { createManualDirectoryAdapter } from "./manual-directory";
import { createSkillfullyAdapter } from "./skillfully";

export function createPublishAdaptersForContext(context: Pick<PublishContext, "skill">): PublishAdapter[] {
  const primaryAdapter = context.skill.sourceMode === "github_import"
    ? createGitHubAppAdapter()
    : createSkillfullyAdapter();

  return [
    primaryAdapter,
    createManualDirectoryAdapter("lobehub"),
    createManualDirectoryAdapter("clawhub"),
    createManualDirectoryAdapter("hermes"),
  ];
}
