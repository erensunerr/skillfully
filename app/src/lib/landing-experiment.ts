export const LANDING_VARIANT_COOKIE = "skillfully_landing_variant";
export const LANDING_DISTINCT_ID_COOKIE = "skillfully_landing_distinct_id";
export const AGENT_FIRST_EXPERIMENT_FLAG_KEY = "landing_agent_first_onboarding";
export const AGENT_FIRST_VARIANT_FLAG_VALUE = "agent_first";
export const DEFAULT_POSTHOG_API_HOST = "https://us.i.posthog.com";

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

function parseCookieString(cookieString: string | null | undefined) {
  if (!cookieString) {
    return new Map<string, string>();
  }

  return new Map(
    cookieString
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf("=");
        if (separatorIndex === -1) {
          return [part, ""] as const;
        }

        return [part.slice(0, separatorIndex), part.slice(separatorIndex + 1)] as const;
      }),
  );
}

export function getLandingVariantFromCookieString(cookieString: string | null | undefined) {
  const variantCookie = parseCookieString(cookieString).get(LANDING_VARIANT_COOKIE);

  if (!variantCookie) {
    return null;
  }

  return normalizeLandingVariant(variantCookie);
}

function parsePostHogCookieValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded) as { distinct_id?: unknown };
    return typeof parsed.distinct_id === "string" && parsed.distinct_id ? parsed.distinct_id : null;
  } catch {
    return null;
  }
}

export function getLandingDistinctIdFromCookieString(
  cookieString: string | null | undefined,
  posthogToken?: string | null,
) {
  const cookies = parseCookieString(cookieString);
  const expectedPostHogCookie = posthogToken ? `ph_${posthogToken}_posthog` : null;

  if (expectedPostHogCookie) {
    const distinctId = parsePostHogCookieValue(cookies.get(expectedPostHogCookie));
    if (distinctId) {
      return distinctId;
    }
  }

  for (const [name, value] of cookies) {
    if (name.startsWith("ph_") && name.endsWith("_posthog")) {
      const distinctId = parsePostHogCookieValue(value);
      if (distinctId) {
        return distinctId;
      }
    }
  }

  return cookies.get(LANDING_DISTINCT_ID_COOKIE) || null;
}
