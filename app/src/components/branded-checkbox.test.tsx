import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { BrandedCheckbox } from "./branded-checkbox";

test("BrandedCheckbox renders a native checkbox with pointer cursor affordances", () => {
  const html = renderToStaticMarkup(
    <BrandedCheckbox checked readOnly>
      Anyone with link can use.
    </BrandedCheckbox>,
  );

  assert.match(html, /type="checkbox"/);
  assert.match(html, /checked=""/);
  assert.match(html, /cursor-pointer/);
  assert.match(html, /peer-checked:bg-\[var\(--ink\)\]/);
  assert.match(html, /Anyone with link can use\./);
});

test("BrandedCheckbox renders disabled checkboxes with a not-allowed cursor", () => {
  const html = renderToStaticMarkup(
    <BrandedCheckbox disabled checked={false} readOnly>
      Disabled skill
    </BrandedCheckbox>,
  );

  assert.match(html, /disabled=""/);
  assert.match(html, /cursor-not-allowed/);
  assert.doesNotMatch(html, /cursor-pointer/);
});
