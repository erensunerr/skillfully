import assert from "node:assert/strict";
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

  for (const testDefinition of AB_TEST_DEFINITIONS) {
    assert.match(html, new RegExp(testDefinition.label));

    for (const variant of testDefinition.variants) {
      assert.match(html, new RegExp(variant.label));
    }
  }
});
