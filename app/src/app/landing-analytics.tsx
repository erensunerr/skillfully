"use client";

import { useEffect, type ReactNode } from "react";

import { captureClientEvent } from "@/lib/client-analytics";
import { AGENT_FIRST_EXPERIMENT_FLAG_KEY } from "@/lib/landing-experiment";
import type { LandingVariant } from "@/lib/landing-experiment";

export function LandingPageView({
  page = "/",
  variant = null,
}: {
  page?: string;
  variant?: LandingVariant | null;
}) {
  useEffect(() => {
    captureClientEvent("landing_page_viewed", {
      page,
      ...(variant ? { variant } : {}),
      landing_experiment: AGENT_FIRST_EXPERIMENT_FLAG_KEY,
    }, variant);
  }, [page, variant]);

  return null;
}

export function LandingAuthLink({
  intent,
  surface,
  className,
  href,
  analytics = {},
  children,
}: {
  intent: string;
  surface: string;
  className?: string;
  href: string;
  analytics?: Record<string, unknown>;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      data-auth-intent={intent}
      data-auth-surface={surface}
      onClick={() => captureClientEvent("landing_auth_cta_clicked", { intent, surface, ...analytics })}
    >
      {children}
    </a>
  );
}
