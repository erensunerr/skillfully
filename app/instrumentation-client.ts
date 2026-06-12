import posthog from "posthog-js";

import {
  AGENT_FIRST_EXPERIMENT_FLAG_KEY,
  AGENT_FIRST_VARIANT_FLAG_VALUE,
  getLandingDistinctIdFromCookieString,
  getLandingVariantFromCookieString,
} from "@/lib/landing-experiment";

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (posthogToken) {
  const cookieString = typeof document === "undefined" ? null : document.cookie;
  const landingDistinctId = getLandingDistinctIdFromCookieString(cookieString, posthogToken);
  const landingVariant = getLandingVariantFromCookieString(cookieString);
  const posthogVariant = landingVariant === "agent-first" ? AGENT_FIRST_VARIANT_FLAG_VALUE : landingVariant;

  posthog.init(posthogToken, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
    bootstrap: {
      ...(landingDistinctId ? { distinctID: landingDistinctId, isIdentifiedID: false } : {}),
      ...(posthogVariant ? { featureFlags: { [AGENT_FIRST_EXPERIMENT_FLAG_KEY]: posthogVariant } } : {}),
    },
  });
}
