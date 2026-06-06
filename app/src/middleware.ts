import { NextRequest, NextResponse } from "next/server";

import {
  AGENT_FIRST_EXPERIMENT_FLAG_KEY,
  LANDING_DISTINCT_ID_COOKIE,
  landingVariantPath,
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
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!projectToken || !posthogHost) {
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
    | { featureFlags?: Record<string, unknown> }
    | null;

  return normalizeLandingVariantFlagValue(payload?.featureFlags?.[AGENT_FIRST_EXPERIMENT_FLAG_KEY]);
}

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;

  if (pathname !== "/" && pathname !== "/agent-first") {
    return NextResponse.next();
  }

  const distinctId = request.cookies.get(LANDING_DISTINCT_ID_COOKIE)?.value ?? crypto.randomUUID();
  const override = normalizeLandingVariant(nextUrl.searchParams.get("landing"));
  if (override) {
    const url = nextUrl.clone();
    url.searchParams.delete("landing");
    url.pathname = landingVariantPath(override);
    return buildCookieResponse(NextResponse.redirect(url), { distinctId, variant: override });
  }

  if (pathname === "/agent-first") {
    const existingVariant = normalizeLandingVariant(request.cookies.get(LANDING_VARIANT_COOKIE)?.value);
    if (existingVariant === "agent-first") {
      return buildCookieResponse(NextResponse.next(), { distinctId });
    }

    return buildCookieResponse(NextResponse.next(), { distinctId, variant: "agent-first" });
  }

  const existingVariant = normalizeLandingVariant(request.cookies.get(LANDING_VARIANT_COOKIE)?.value);
  if (existingVariant === "agent-first") {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = "/agent-first";
    return buildCookieResponse(NextResponse.redirect(redirectUrl), { distinctId, variant: existingVariant });
  }

  if (existingVariant === "control") {
    return buildCookieResponse(NextResponse.next(), { distinctId, variant: existingVariant });
  }

  const assignedVariant = await getPostHogLandingVariant(distinctId);
  if (assignedVariant === "agent-first") {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = "/agent-first";
    return buildCookieResponse(NextResponse.redirect(redirectUrl), { distinctId, variant: assignedVariant });
  }

  if (assignedVariant === "control") {
    return buildCookieResponse(NextResponse.next(), { distinctId, variant: assignedVariant });
  }

  return buildCookieResponse(NextResponse.next(), { distinctId });
}

export const config = {
  matcher: ["/", "/agent-first"],
};
