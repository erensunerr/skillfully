export const LANDING_VARIANT_COOKIE = "skillfully_landing_variant";
export const AGENT_FIRST_EXPERIMENT_FLAG_KEY = "landing_agent_first_onboarding";

export type LandingVariant = "control" | "agent-first";

export function normalizeLandingVariant(value: string | null | undefined): LandingVariant | null {
  if (value === "control" || value === "agent-first") {
    return value;
  }

  return null;
}

export function assignLandingVariant(sample: number, testAllocation = 0.25): LandingVariant {
  if (!Number.isFinite(sample)) {
    return "control";
  }

  return sample >= 0 && sample < testAllocation ? "agent-first" : "control";
}

export function landingVariantPath(variant: LandingVariant) {
  return variant === "agent-first" ? "/agent-first" : "/";
}

export function isAgentFirstExperimentEnabled() {
  return (
    process.env.NEXT_PUBLIC_AGENT_FIRST_EXPERIMENT === "1" ||
    process.env.AGENT_FIRST_EXPERIMENT === "1"
  );
}
