export const LANDING_VARIANT_COOKIE = "skillfully_landing_variant";
export const AGENT_FIRST_EXPERIMENT_FLAG_KEY = "landing_agent_first_onboarding";
const DEFAULT_AGENT_FIRST_EXPERIMENT_ALLOCATION = 0.25;

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

export function parseLandingExperimentAllocation(
  value: string | null | undefined,
  defaultAllocation = DEFAULT_AGENT_FIRST_EXPERIMENT_ALLOCATION,
) {
  if (value === null || value === undefined || value.trim() === "") {
    return defaultAllocation;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultAllocation;
  }

  if (parsed >= 0 && parsed <= 1) {
    return parsed;
  }

  if (parsed >= 0 && parsed <= 100) {
    return parsed / 100;
  }

  return defaultAllocation;
}

export function getLandingExperimentAllocation() {
  return parseLandingExperimentAllocation(
    process.env.AGENT_FIRST_EXPERIMENT_ALLOCATION ?? process.env.NEXT_PUBLIC_AGENT_FIRST_EXPERIMENT_ALLOCATION,
  );
}

export function getLandingExperimentProperties(variant: LandingVariant | null) {
  if (!variant) {
    return {};
  }

  return {
    landing_variant: variant,
    landing_experiment: AGENT_FIRST_EXPERIMENT_FLAG_KEY,
  };
}

export function getLandingVariantFromCookieString(cookieString: string | null | undefined) {
  if (!cookieString) {
    return null;
  }

  const variantCookie = cookieString
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LANDING_VARIANT_COOKIE}=`));

  if (!variantCookie) {
    return null;
  }

  return normalizeLandingVariant(variantCookie.slice(LANDING_VARIANT_COOKIE.length + 1));
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
