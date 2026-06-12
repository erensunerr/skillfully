import { NextRequest, NextResponse } from "next/server";

import {
  AGENT_FIRST_EXPERIMENT_FLAG_KEY,
  DEFAULT_POSTHOG_API_HOST,
  getLandingDistinctIdFromCookieString,
  LANDING_DISTINCT_ID_COOKIE,
  LANDING_VARIANT_COOKIE,
  normalizeLandingVariant,
  normalizeLandingVariantFlagValue,
  type LandingVariant,
} from "@/lib/landing-experiment";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const FLAGS_ENDPOINT_VERSION = "2";

function buildCookieResponse(
  response: NextResponse,
  {
    distinctId,
    variant,
  }: {
    distinctId?: string | null;
    variant?: LandingVariant | null;
  } = {},
) {
  if (variant) {
    response.cookies.set(LANDING_VARIANT_COOKIE, variant, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
  }

  if (distinctId) {
    response.cookies.set(LANDING_DISTINCT_ID_COOKIE, distinctId, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}

async function getPostHogLandingVariant(distinctId: string) {
  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_API_HOST;

  if (!projectToken) {
    return null;
  }

  const response = await fetch(`${posthogHost.replace(/\/$/, "")}/flags/?v=${FLAGS_ENDPOINT_VERSION}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      token: projectToken,
      api_key: projectToken,
      distinct_id: distinctId,
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as
    | { featureFlags?: Record<string, unknown>; flags?: Record<string, unknown> }
    | null;

  const featureFlags = payload?.featureFlags ?? payload?.flags;
  return normalizeLandingVariantFlagValue(featureFlags?.[AGENT_FIRST_EXPERIMENT_FLAG_KEY]);
}

export async function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;

  if (pathname !== "/") {
    return NextResponse.next();
  }

  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const distinctId =
    getLandingDistinctIdFromCookieString(request.headers.get("cookie"), projectToken) ?? crypto.randomUUID();

  const existingVariant = normalizeLandingVariant(request.cookies.get(LANDING_VARIANT_COOKIE)?.value);
  if (existingVariant) {
    return buildCookieResponse(NextResponse.next(), { distinctId, variant: existingVariant });
  }

  const assignedVariant = await getPostHogLandingVariant(distinctId);
  if (assignedVariant) {
    return buildCookieResponse(NextResponse.next(), { distinctId, variant: assignedVariant });
  }

  return buildCookieResponse(NextResponse.next(), { distinctId });
}

export const config = {
  matcher: ["/"],
};
