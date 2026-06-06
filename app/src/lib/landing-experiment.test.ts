import assert from "node:assert/strict";
import test from "node:test";

import {
  assignLandingVariant,
  getLandingExperimentProperties,
  getLandingVariantFromCookieString,
  landingVariantPath,
  normalizeLandingVariant,
  parseLandingExperimentAllocation,
} from "@/lib/landing-experiment";

test("normalizeLandingVariant accepts supported values only", () => {
  assert.equal(normalizeLandingVariant("control"), "control");
  assert.equal(normalizeLandingVariant("agent-first"), "agent-first");
  assert.equal(normalizeLandingVariant("something-else"), null);
  assert.equal(normalizeLandingVariant(null), null);
});

test("assignLandingVariant sends the first quarter to agent-first", () => {
  assert.equal(assignLandingVariant(0), "agent-first");
  assert.equal(assignLandingVariant(0.2499), "agent-first");
  assert.equal(assignLandingVariant(0.25), "control");
  assert.equal(assignLandingVariant(0.9), "control");
});

test("parseLandingExperimentAllocation accepts ratios and percentages and falls back safely", () => {
  assert.equal(parseLandingExperimentAllocation(undefined), 0.25);
  assert.equal(parseLandingExperimentAllocation("0.4"), 0.4);
  assert.equal(parseLandingExperimentAllocation("40"), 0.4);
  assert.equal(parseLandingExperimentAllocation("100"), 1);
  assert.equal(parseLandingExperimentAllocation("-4"), 0.25);
  assert.equal(parseLandingExperimentAllocation("wat"), 0.25);
});

test("landing experiment helpers recover the assigned variant and analytics properties", () => {
  assert.equal(getLandingVariantFromCookieString("foo=bar; skillfully_landing_variant=agent-first"), "agent-first");
  assert.equal(getLandingVariantFromCookieString("foo=bar"), null);
  assert.deepEqual(getLandingExperimentProperties("agent-first"), {
    landing_variant: "agent-first",
    landing_experiment: "landing_agent_first_onboarding",
  });
  assert.deepEqual(getLandingExperimentProperties(null), {});
});

test("landingVariantPath maps variants to routes", () => {
  assert.equal(landingVariantPath("control"), "/");
  assert.equal(landingVariantPath("agent-first"), "/agent-first");
});
