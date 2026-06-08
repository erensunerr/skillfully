export type AgentSkillAnswer = "yes" | "no" | null;
export type AgentAccessAnswer = "yes" | "no" | null;
export type AgentFirstQuizState = "start" | "halfway" | "needs_learning" | "ready_now";

export function getAgentFirstQuizState(
  knowsAgentSkill: AgentSkillAnswer,
  hasAgentAccess: AgentAccessAnswer,
): AgentFirstQuizState {
  if (knowsAgentSkill === "no") {
    return "needs_learning";
  }

  if (knowsAgentSkill !== "yes") {
    return "start";
  }

  if (hasAgentAccess === "yes") {
    return "ready_now";
  }

  if (hasAgentAccess === "no") {
    return "needs_learning";
  }

  return "halfway";
}

export function shouldAskAgentAccess(knowsAgentSkill: AgentSkillAnswer) {
  return knowsAgentSkill === "yes";
}
