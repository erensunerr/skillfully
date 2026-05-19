import { buildUserSkillInstallPrompt } from "@/lib/skills/install-prompts";
import type { PublishContext, PublishResult } from "./types";

const PUBLIC_BASE_URL = "https://www.skillfully.sh";
const INSTALL_CONFIRMATION_EVENTS = ["skill_installed", "feedback_received"] as const;

type PublishResultEnvelope = {
  results: PublishResult[];
};

type PublishConfirmation = {
  install_endpoint: string;
  feedback_endpoint: string;
  success_events: typeof INSTALL_CONFIRMATION_EVENTS;
};

type PublishNextAction =
  | {
      type: "merge_github_pull_request";
      message: string;
      pull_request_url: string;
      install_prompt: string;
      confirmation: PublishConfirmation;
    }
  | {
      type: "install_skill";
      message: string;
      pull_request_url?: undefined;
      install_prompt: string;
      confirmation: PublishConfirmation;
    };

export type PublishResponse = PublishResultEnvelope & {
  install_prompt?: string;
  next_action?: PublishNextAction;
};

function installPromptForContext(context: PublishContext) {
  const githubTarget = context.skill.sourceMode === "github_import" ? context.githubTarget : null;
  return buildUserSkillInstallPrompt({
    name: context.skill.name,
    slug: context.skill.slug,
    skillId: context.skill.skillId,
    repoFullName: githubTarget?.repoFullName ?? null,
    skillRoot: githubTarget?.skillRoot ?? context.skill.originalSkillPath ?? null,
  });
}

function confirmationForSkill(skillId: string): PublishConfirmation {
  return {
    install_endpoint: `${PUBLIC_BASE_URL}/api/public/skills/${skillId}/install`,
    feedback_endpoint: `${PUBLIC_BASE_URL}/feedback/${skillId}`,
    success_events: INSTALL_CONFIRMATION_EVENTS,
  };
}

export function buildPublishResponse({
  context,
  result,
}: {
  context: PublishContext;
  result: PublishResultEnvelope;
}): PublishResponse {
  const completed = result.results.some((entry) => entry.status === "published" || entry.status === "submitted");
  if (!completed) {
    return result;
  }

  const installPrompt = installPromptForContext(context);
  const confirmation = confirmationForSkill(context.skill.skillId);
  const githubSubmission = result.results.find(
    (entry) => entry.targetKind === "github" && entry.status === "submitted" && entry.url,
  );

  if (githubSubmission?.url) {
    return {
      ...result,
      install_prompt: installPrompt,
      next_action: {
        type: "merge_github_pull_request",
        message: "Merge this GitHub pull request before installing the skill.",
        pull_request_url: githubSubmission.url,
        install_prompt: installPrompt,
        confirmation,
      },
    };
  }

  return {
    ...result,
    install_prompt: installPrompt,
    next_action: {
      type: "install_skill",
      message: "Install the skill, then confirm by calling the install endpoint or submitting feedback.",
      install_prompt: installPrompt,
      confirmation,
    },
  };
}
