"use client";

import { type ReactNode, useEffect } from "react";
import Link from "next/link";

import { captureClientEvent } from "@/lib/client-analytics";

type LandingAuthIntent = "sign_in" | "sign_up";

export function LandingPageView() {
  useEffect(() => {
    captureClientEvent("landing_page_viewed", { page: "/" });
  }, []);

  return null;
}

export function LandingAuthLink({
  href = "/dashboard",
  intent,
  surface,
  className,
  children,
}: {
  href?: string;
  intent: LandingAuthIntent;
  surface: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      data-auth-intent={intent}
      data-auth-surface={surface}
      onClick={() => captureClientEvent("landing_auth_cta_clicked", { intent, surface })}
    >
      {children}
    </Link>
  );
}
