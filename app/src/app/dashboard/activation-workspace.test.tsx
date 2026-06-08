import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ActivationWorkspace } from "./activation-workspace";

test("activation workspace renders template generate and import entry points", () => {
  Object.assign(globalThis, { React });
  const html = renderToStaticMarkup(
    <ActivationWorkspace
      mode="template"
      form={{ name: "", audience: "", job: "", examplePrompt: "" }}
      isSubmitting={false}
      onModeSelect={() => undefined}
      onFormChange={() => undefined}
      onStartImport={() => undefined}
      onCreate={() => undefined}
    />,
  );

  assert.match(html, /Create your first skill draft/i);
  assert.match(html, /Start from a proven scaffold/i);
  assert.match(html, /Turn an idea into a draft/i);
  assert.match(html, /Import from GitHub/i);
  assert.match(html, /Create draft and open editor/i);
  assert.match(html, /href="\/guide"/i);
});
