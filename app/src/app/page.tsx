import { PostHogProvider } from "@posthog/next";

import { AGENT_FIRST_EXPERIMENT_FLAG_KEY } from "@/lib/landing-experiment";

import LandingPageClient from "./landing-page-client";

export const dynamic = "force-dynamic";

const posthogClientOptions = {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: "2026-01-30" as const,
  capture_exceptions: true,
  debug: process.env.NODE_ENV === "development",
};

const posthogServerOptions = {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
};

export { LandingPageContent } from "./landing-page-client";

export default function LandingPage() {
  return (
    <PostHogProvider
      apiKey={process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN}
      clientOptions={posthogClientOptions}
      serverOptions={posthogServerOptions}
      bootstrapFlags={{ flags: [AGENT_FIRST_EXPERIMENT_FLAG_KEY] }}
    >
      <LandingPageClient />
    </PostHogProvider>
  );
}
