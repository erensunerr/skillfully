import assert from "node:assert/strict";
import test from "node:test";

import {
  AGENT_FIRST_VARIANT_FLAG_VALUE,
  getLandingExperimentProperties,
  getLandingDistinctIdFromCookieString,
  getLandingVariantFromCookieString,
  normalizeLandingVariant,
  normalizeLandingVariantFlagResponse,
  normalizeLandingVariantFlagValue,
} from "@/lib/landing-experiment";

test("normalizeLandingVariant accepts supported values only", () => {
  assert.equal(normalizeLandingVariant("control"), "control");
  assert.equal(normalizeLandingVariant("agent-first"), "agent-first");
  assert.equal(normalizeLandingVariant("something-else"), null);
  assert.equal(normalizeLandingVariant(null), null);
});

test("normalizeLandingVariantFlagValue maps PostHog values to routing variants", () => {
  assert.equal(normalizeLandingVariantFlagValue("control"), "control");
  assert.equal(normalizeLandingVariantFlagValue(AGENT_FIRST_VARIANT_FLAG_VALUE), "agent-first");
  assert.equal(normalizeLandingVariantFlagValue("agent-first"), "agent-first");
  assert.equal(normalizeLandingVariantFlagValue(true), "agent-first");
  assert.equal(normalizeLandingVariantFlagValue(false), "control");
  assert.equal(normalizeLandingVariantFlagValue("unknown"), null);
});

test("normalizeLandingVariantFlagResponse maps current PostHog flags v2 objects", () => {
  assert.equal(
    normalizeLandingVariantFlagResponse({
      key: "landing_agent_first_onboarding",
      enabled: true,
      variant: AGENT_FIRST_VARIANT_FLAG_VALUE,
    }),
    "agent-first",
  );
  assert.equal(
    normalizeLandingVariantFlagResponse({
      key: "landing_agent_first_onboarding",
      enabled: true,
      variant: "control",
    }),
    "control",
  );
  assert.equal(normalizeLandingVariantFlagResponse({ enabled: true }), "agent-first");
  assert.equal(normalizeLandingVariantFlagResponse({ enabled: false }), "control");
  assert.equal(normalizeLandingVariantFlagResponse({ enabled: true, variant: "unknown" }), "agent-first");
  assert.equal(normalizeLandingVariantFlagResponse({}), null);
});

test("landing experiment helpers recover the assigned variant and analytics properties", () => {
  assert.equal(getLandingVariantFromCookieString("foo=bar; skillfully_landing_variant=agent-first"), "agent-first");
  assert.equal(getLandingVariantFromCookieString("foo=bar"), null);
  assert.deepEqual(getLandingExperimentProperties("agent-first"), {
    landing_variant: "agent-first",
    landing_experiment: "landing_agent_first_onboarding",
    "$feature/landing_agent_first_onboarding": "agent_first",
    $active_feature_flags: ["landing_agent_first_onboarding"],
  });
  assert.deepEqual(getLandingExperimentProperties("control"), {
    landing_variant: "control",
    landing_experiment: "landing_agent_first_onboarding",
    "$feature/landing_agent_first_onboarding": "control",
    $active_feature_flags: ["landing_agent_first_onboarding"],
  });
  assert.deepEqual(getLandingExperimentProperties(null), {});
});

test("landing distinct id prefers PostHog persistence cookies before the bootstrap cookie", () => {
  const posthogCookie = encodeURIComponent(JSON.stringify({ distinct_id: "posthog-anon-id" }));

  assert.equal(
    getLandingDistinctIdFromCookieString(
      `skillfully_landing_distinct_id=landing-id; ph_phc_test_posthog=${posthogCookie}`,
      "phc_test",
    ),
    "posthog-anon-id",
  );
  assert.equal(
    getLandingDistinctIdFromCookieString("skillfully_landing_distinct_id=landing-id", "phc_test"),
    "landing-id",
  );
  assert.equal(getLandingDistinctIdFromCookieString("foo=bar", "phc_test"), null);
});
