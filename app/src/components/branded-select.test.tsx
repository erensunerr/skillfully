import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { BrandedSelect, DropdownChevron } from "./branded-select";

const options = [
  { value: "use", label: "Use" },
  { value: "edit", label: "Edit" },
];

test("BrandedSelect renders a single on-brand dropdown control", () => {
  const html = renderToStaticMarkup(
    <BrandedSelect
      ariaLabel="Permission"
      value="use"
      options={options}
      onChange={() => undefined}
    />,
  );

  assert.match(html, /aria-label="Permission"/);
  assert.match(html, /borderColor:var\(--ink\)|border-color:var\(--ink\)/);
  assert.match(html, /cursor:pointer/);
  assert.match(html, /data-dropdown-chevron="closed"/);
  assert.doesNotMatch(html, /<select/);
});

test("BrandedSelect disabled state uses the same shape with not-allowed cursor", () => {
  const html = renderToStaticMarkup(
    <BrandedSelect
      ariaLabel="Owner permission"
      value="edit"
      options={options}
      disabled
      onChange={() => undefined}
    />,
  );

  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /cursor:not-allowed/);
  assert.match(html, /data-dropdown-chevron="closed"/);
});

test("DropdownChevron uses one visual arrow for every dropdown", () => {
  const closed = renderToStaticMarkup(<DropdownChevron />);
  const open = renderToStaticMarkup(<DropdownChevron open />);

  assert.match(closed, /data-dropdown-chevron="closed"/);
  assert.match(open, /data-dropdown-chevron="open"/);
  assert.match(closed, /border-\[var\(--ink\)\]/);
  assert.match(open, /rotate-180/);
});
