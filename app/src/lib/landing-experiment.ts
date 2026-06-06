export const LANDING_VARIANT_COOKIE = "skillfully_landing_variant";
export const LANDING_DISTINCT_ID_COOKIE = "skillfully_landing_distinct_id";
export const AGENT_FIRST_EXPERIMENT_FLAG_KEY = "landing_agent_first_onboarding";
export const AGENT_FIRST_VARIANT_FLAG_VALUE = "agent_first";

export type LandingVariant = "control" | "agent-first";

export function normalizeLandingVariant(value: string | null | undefined): LandingVariant | null {
  if (value === "control" || value === "agent-first") {
    return value;
  }

  return null;
}

export function normalizeLandingVariantFlagValue(value: unknown): LandingVariant | null {
  if (value === true) {
    return "agent-first";
  }

  if (value === false) {
    return "control";
  }

  if (value === "control") {
    return "control";
  }

  if (value === AGENT_FIRST_VARIANT_FLAG_VALUE || value === "agent-first") {
    return "agent-first";
  }

  return null;
}

export function getLandingExperimentProperties(variant: LandingVariant | null) {
  if (!variant) {
    return {};
  }

  const posthogVariantValue = variant === "agent-first" ? AGENT_FIRST_VARIANT_FLAG_VALUE : "control";

  return {
    landing_variant: variant,
    landing_experiment: AGENT_FIRST_EXPERIMENT_FLAG_KEY,
    [`$feature/${AGENT_FIRST_EXPERIMENT_FLAG_KEY}`]: posthogVariantValue,
    $active_feature_flags: [AGENT_FIRST_EXPERIMENT_FLAG_KEY],
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
