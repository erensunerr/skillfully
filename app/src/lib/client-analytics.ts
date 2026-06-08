import posthog from "posthog-js";

import {
  getLandingExperimentProperties,
  getLandingVariantFromCookieString,
} from "@/lib/landing-experiment";

const hasClientPosthogToken = Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN);

function getClientAnalyticsContextProperties() {
  if (typeof document === "undefined") {
    return {};
  }

  const landingVariant = getLandingVariantFromCookieString(document.cookie);
  return getLandingExperimentProperties(landingVariant);
}

export function captureClientEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!hasClientPosthogToken) {
    return;
  }

  try {
    posthog.capture(eventName, { ...getClientAnalyticsContextProperties(), ...properties });
  } catch {
    // Analytics must never block dashboard interactions.
  }
}

export function captureClientException(error: unknown) {
  if (!hasClientPosthogToken) {
    return;
  }

  try {
    posthog.captureException(error);
  } catch {
    // Analytics must never block dashboard interactions.
  }
}

export function identifyClientUser(userId: string, properties?: Record<string, unknown>) {
  if (!hasClientPosthogToken) {
    return;
  }

  try {
    posthog.identify(userId, { ...getClientAnalyticsContextProperties(), ...properties });
  } catch {
    // Analytics must never block dashboard interactions.
  }
}

export function resetClientAnalytics() {
  if (!hasClientPosthogToken) {
    return;
  }

  try {
    posthog.reset();
  } catch {
    // Analytics must never block dashboard interactions.
  }
}
