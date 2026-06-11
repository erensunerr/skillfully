import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { NextRequest } from "next/server";

import {
  DEFAULT_POSTHOG_API_HOST,
  LANDING_DISTINCT_ID_COOKIE,
  LANDING_VARIANT_COOKIE,
} from "@/lib/landing-experiment";

import { middleware } from "./middleware";

const originalFetch = globalThis.fetch;
const originalProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const originalPostHogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalProjectToken === undefined) {
    delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  } else {
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = originalProjectToken;
  }

  if (originalPostHogHost === undefined) {
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  } else {
    process.env.NEXT_PUBLIC_POSTHOG_HOST = originalPostHogHost;
  }
});

test("middleware evaluates landing experiment flags through the default PostHog host", async () => {
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

  const flagRequest: { url: string; body: { distinct_id?: string } | null } = { url: "", body: null };
  globalThis.fetch = async (url, init) => {
    flagRequest.url = String(url);
    flagRequest.body = init?.body ? JSON.parse(String(init.body)) : null;
    return Response.json({ featureFlags: { landing_agent_first_onboarding: "agent_first" } });
  };

  const response = await middleware(new NextRequest("http://localhost/"));
  const distinctId = response.cookies.get(LANDING_DISTINCT_ID_COOKIE)?.value;

  assert.equal(flagRequest.url, `${DEFAULT_POSTHOG_API_HOST}/flags/?v=2`);
  assert.equal(flagRequest.body?.distinct_id, distinctId);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.cookies.get(LANDING_VARIANT_COOKIE)?.value, "agent-first");
  assert.ok(distinctId);
});

test("middleware reuses the PostHog anonymous id when evaluating the landing flag", async () => {
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

  const posthogCookie = encodeURIComponent(JSON.stringify({ distinct_id: "posthog-anon-id" }));
  const flagRequest: { body: { distinct_id?: string } | null } = { body: null };
  globalThis.fetch = async (_url, init) => {
    flagRequest.body = init?.body ? JSON.parse(String(init.body)) : null;
    return Response.json({ featureFlags: { landing_agent_first_onboarding: "control" } });
  };

  const response = await middleware(
    new NextRequest("http://localhost/", {
      headers: {
        cookie: `skillfully_landing_distinct_id=landing-id; ph_phc_test_posthog=${posthogCookie}`,
      },
    }),
  );

  assert.equal(flagRequest.body?.distinct_id, "posthog-anon-id");
  assert.equal(response.cookies.get(LANDING_DISTINCT_ID_COOKIE)?.value, "posthog-anon-id");
  assert.equal(response.cookies.get(LANDING_VARIANT_COOKIE)?.value, "control");
});

test("middleware redirects legacy agent-first route to the root without changing assigned control visitors", async () => {
  const response = await middleware(
    new NextRequest("http://localhost/agent-first", {
      headers: {
        cookie: "skillfully_landing_variant=control; skillfully_landing_distinct_id=control-id",
      },
    }),
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/");
  assert.equal(response.cookies.get(LANDING_DISTINCT_ID_COOKIE)?.value, "control-id");
  assert.equal(response.cookies.get(LANDING_VARIANT_COOKIE)?.value, "control");
});

test("middleware redirects legacy agent-first route to the root as agent-first for unassigned visitors", async () => {
  const response = await middleware(new NextRequest("http://localhost/agent-first"));

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/");
  assert.equal(response.cookies.get(LANDING_VARIANT_COOKIE)?.value, "agent-first");
  assert.ok(response.cookies.get(LANDING_DISTINCT_ID_COOKIE)?.value);
});
