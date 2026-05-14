import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { OnboardingModal } from "./onboarding-modal";

test("onboarding modal renders the start choices and guide action", () => {
  Object.assign(globalThis, { React });
  const html = renderToStaticMarkup(
    <OnboardingModal
      onClose={() => undefined}
      onConnectGitHub={() => undefined}
      onCreateSkill={() => undefined}
    />,
  );
  const removedRoutePattern = new RegExp("/" + "do" + "cs");

  assert.match(html, /How do you want to start\?/);
  assert.match(html, /Already have a skill\?/);
  assert.match(html, /Create your first skill/);
  assert.match(html, /Connect GitHub/);
  assert.match(html, /href="\/guide"/);
  assert.doesNotMatch(html, removedRoutePattern);
});
