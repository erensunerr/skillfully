import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("dashboard skill detail renders the operational overview UI", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillDetail
      skill={{
        id: "skill-1",
        ownerId: "user-1",
        name: "demo-skill",
        description: "A helpful AI assistant for customer support tasks.",
        skillId: "sk_demo123",
        createdAt: Date.now(),
      } as never}
      entries={[
        {
          id: "feedback-1",
          ownerId: "user-1",
          skillId: "sk_demo123",
          rating: "positive",
          feedback: "Great job! This solved my issue in seconds.",
          createdAt: Date.now(),
        },
        {
          id: "feedback-2",
          ownerId: "user-1",
          skillId: "sk_demo123",
          rating: "negative",
          feedback: "Got an error while trying to authenticate my account.",
          createdAt: Date.now() - 1000,
        },
      ] as never}
      feedbackTemplate="Post feedback to {{feedbackUrl}}"
      feedbackTemplateError={null}
      onBack={() => undefined}
    />,
  );

  assert.match(html, /demo-skill/);
  assert.match(html, /v2\.3\.0/);
  assert.match(html, /Published/);
  assert.match(html, /Go to Editor/);
  assert.match(html, /Copy installation prompt/);
  assert.match(html, /Success rate/i);
  assert.match(html, /Active users/i);
  assert.match(html, /Usage over time/i);
  assert.match(html, /Skill health/i);
  assert.match(html, /Needs attention/i);
  assert.match(html, /Feedback sentiment/i);
  assert.match(html, /Recent feedback/i);
  assert.match(html, /Publishing &amp; directory status/i);
  assert.match(html, /Version snapshot/i);
});
