export type AgentFirstTransitionMode = "soft-rewrite" | "letter-decode" | "fade-swap";

export type AgentFirstTransitionOption = {
  value: AgentFirstTransitionMode;
  label: string;
};

export const DEFAULT_AGENT_FIRST_TRANSITION_MODE: AgentFirstTransitionMode = "soft-rewrite";
export const AGENT_FIRST_TRANSITION_STORAGE_KEY = "skillfully_agent_first_transition_mode";
export const AGENT_FIRST_TRANSITION_CHANGE_EVENT = "skillfully-agent-first-transition-change";

export const AGENT_FIRST_TRANSITION_MODES = [
  { value: "soft-rewrite", label: "Soft rewrite" },
  { value: "letter-decode", label: "Letter decode" },
  { value: "fade-swap", label: "Fade swap" },
] as const satisfies readonly AgentFirstTransitionOption[];

export function normalizeAgentFirstTransitionMode(value: unknown): AgentFirstTransitionMode {
  return AGENT_FIRST_TRANSITION_MODES.some((mode) => mode.value === value)
    ? (value as AgentFirstTransitionMode)
    : DEFAULT_AGENT_FIRST_TRANSITION_MODE;
}
