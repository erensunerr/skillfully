import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AB_TEST_DEFINITIONS } from "@/lib/ab-test-registry";

import { DevABTestOverlay } from "./dev-ab-test-overlay";

test("dev A/B test overlay is disabled outside the development runtime by default", () => {
  assert.equal(renderToStaticMarkup(<DevABTestOverlay />), "");
});

test("dev A/B test overlay renders from the central A/B test registry", () => {
  const html = renderToStaticMarkup(<DevABTestOverlay enabled defaultOpen />);

  assert.match(html, />dev</);
  assert.match(html, /A\/B test overlay/);
  assert.doesNotMatch(html, /Agent-first transition/);

  for (const testDefinition of AB_TEST_DEFINITIONS) {
    assert.match(html, new RegExp(testDefinition.label));

    for (const variant of testDefinition.variants) {
      assert.match(html, new RegExp(variant.label));
      assert.match(html, new RegExp(variant.value));
    }
  }

  assert.doesNotMatch(html, /Local animation preview/);
});

test("dev A/B test overlay defaults every flag control to auto", () => {
  const html = renderToStaticMarkup(<DevABTestOverlay enabled defaultOpen />);

  assert.match(html, /aria-pressed="true"[^>]*>auto</);
});

test("dev A/B test overlay uses PostHog feature flag overrides instead of cookies", async () => {
  const source = await readFile(new URL("./dev-ab-test-overlay.tsx", import.meta.url), "utf8");

  assert.match(source, /posthog\.featureFlags\.overrideFeatureFlags\(\{ flags: activeOverrideFlags \}\)/);
  assert.match(source, /posthog\.featureFlags\.overrideFeatureFlags\(false\)/);
  assert.doesNotMatch(source, /document\.cookie/);
  assert.doesNotMatch(source, /window\.location\.reload/);
});

test("dev A/B test overlay displays the resolved PostHog value separately from the override mode", async () => {
  const source = await readFile(new URL("./dev-ab-test-overlay.tsx", import.meta.url), "utf8");

  assert.match(source, /resolvedVariants\[test\.key\]/);
  assert.match(source, /resolvedVariant/);
  assert.match(source, /overrideSelection === variant\.value/);
  assert.doesNotMatch(source, /activeVariant === variant\.value/);
  assert.doesNotMatch(source, /useFeatureFlagVariantKey/);
});
