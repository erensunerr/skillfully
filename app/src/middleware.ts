import { NextRequest, NextResponse } from "next/server";

import {
  assignLandingVariant,
  landingVariantPath,
  LANDING_VARIANT_COOKIE,
  normalizeLandingVariant,
  type LandingVariant,
  isAgentFirstExperimentEnabled,
} from "@/lib/landing-experiment";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function buildCookieResponse(response: NextResponse, variant: LandingVariant) {
  response.cookies.set(LANDING_VARIANT_COOKIE, variant, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

function randomSample() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] / 0xffffffff;
}

export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;

  if (pathname !== "/" && pathname !== "/agent-first") {
    return NextResponse.next();
  }

  const override = normalizeLandingVariant(nextUrl.searchParams.get("landing"));
  if (override) {
    const url = nextUrl.clone();
    url.searchParams.delete("landing");
    url.pathname = landingVariantPath(override);
    return buildCookieResponse(NextResponse.redirect(url), override);
  }

  if (pathname === "/agent-first") {
    const existingVariant = normalizeLandingVariant(request.cookies.get(LANDING_VARIANT_COOKIE)?.value);
    if (existingVariant === "agent-first") {
      return NextResponse.next();
    }

    return buildCookieResponse(NextResponse.next(), "agent-first");
  }

  const existingVariant = normalizeLandingVariant(request.cookies.get(LANDING_VARIANT_COOKIE)?.value);
  if (existingVariant === "agent-first") {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = "/agent-first";
    return buildCookieResponse(NextResponse.redirect(redirectUrl), existingVariant);
  }

  if (existingVariant === "control") {
    return NextResponse.next();
  }

  if (!isAgentFirstExperimentEnabled()) {
    return NextResponse.next();
  }

  const assignedVariant = assignLandingVariant(randomSample());
  if (assignedVariant === "agent-first") {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = "/agent-first";
    return buildCookieResponse(NextResponse.redirect(redirectUrl), assignedVariant);
  }

  return buildCookieResponse(NextResponse.next(), assignedVariant);
}

export const config = {
  matcher: ["/", "/agent-first"],
};
