import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("proxy only seeds PostHog identity for SSR flag bootstrap", async () => {
  const source = await readFile(new URL("./proxy.ts", import.meta.url), "utf8");

  assert.match(source, /postHogMiddleware/);
  assert.match(source, /NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN/);
  assert.match(source, /ingest/);
  assert.doesNotMatch(source, /landing_agent_first_onboarding/);
  assert.doesNotMatch(source, /LANDING_VARIANT_COOKIE/);
  assert.doesNotMatch(source, /normalizeLandingVariant/);
  assert.doesNotMatch(source, /NextResponse\.redirect/);
});
