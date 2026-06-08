import assert from "node:assert/strict";
import test from "node:test";

import {
  AGENT_FIRST_VARIANT_FLAG_VALUE,
  getLandingExperimentProperties,
  getLandingVariantFromCookieString,
  landingVariantPath,
  normalizeLandingVariant,
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

test("landing experiment helpers recover the assigned variant and analytics properties", () => {
  assert.equal(getLandingVariantFromCookieString("foo=bar; skillfully_landing_variant=agent-first"), "agent-first");
  assert.equal(getLandingVariantFromCookieString("foo=bar"), null);
  assert.deepEqual(getLandingExperimentProperties("agent-first"), {
    landing_variant: "agent-first",
    landing_experiment: "landing_agent_first_onboarding",
    "$feature/landing_agent_first_onboarding": "agent_first",
    $active_feature_flags: ["landing_agent_first_onboarding"],
  });
  assert.deepEqual(getLandingExperimentProperties(null), {});
});

test("landingVariantPath maps variants to routes", () => {
  assert.equal(landingVariantPath("control"), "/");
  assert.equal(landingVariantPath("agent-first"), "/agent-first");
});
