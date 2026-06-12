import posthog from "posthog-js";

const hasClientPosthogToken = Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN);

export function captureClientEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!hasClientPosthogToken) {
    return;
  }

  try {
    posthog.capture(eventName, properties);
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
    posthog.identify(userId, properties);
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
