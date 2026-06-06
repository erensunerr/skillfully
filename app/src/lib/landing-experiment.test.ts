import assert from "node:assert/strict";
import test from "node:test";

import {
  assignLandingVariant,
  landingVariantPath,
  normalizeLandingVariant,
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

test("landingVariantPath maps variants to routes", () => {
  assert.equal(landingVariantPath("control"), "/");
  assert.equal(landingVariantPath("agent-first"), "/agent-first");
});
