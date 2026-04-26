import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

function fakeSkill() {
  return {
    id: "skill-1",
    ownerId: "user-1",
    name: "demo-skill",
    description: "A helpful AI assistant for customer support tasks.",
    skillId: "sk_demo123",
    createdAt: Date.now(),
  } as never;
}

function fakeEntries() {
  return [
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
  ] as never;
}

test("dashboard skill detail renders the operational overview UI", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillDetail
      skill={fakeSkill()}
      entries={fakeEntries()}
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

test("dashboard skill detail renders the editor tab UI", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillDetail
      activeTab="editor"
      skill={fakeSkill()}
      entries={fakeEntries()}
      feedbackTemplate="Install skill from {{feedbackUrl}}"
      feedbackTemplateError={null}
      onBack={() => undefined}
    />,
  );

  assert.match(html, /Files/);
  assert.match(html, /Frontmatter/);
  assert.match(html, /Validate skill/);
  assert.match(html, /Upload file/);
  assert.match(html, /Markdown files \(editable\)/i);
  assert.match(html, /SKILL\.md/);
  assert.match(html, /assets\/logo\.png/);
  assert.match(html, /When to use/);
  assert.match(html, /Workflow/);
  assert.match(html, /Skill standard passed/);
  assert.match(html, /Version history/);
  assert.match(html, /Publishing destinations/);
  assert.match(html, /Publish version/);
  assert.match(html, /Install skill prompt/);
});

test("dashboard skill detail renders the analytics tab UI", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillDetail
      activeTab="analytics"
      skill={fakeSkill()}
      entries={fakeEntries()}
      feedbackTemplate="Post feedback to {{feedbackUrl}}"
      feedbackTemplateError={null}
      onBack={() => undefined}
    />,
  );

  assert.match(html, /Published v2\.3\.0/);
  assert.match(html, /Search feedback/);
  assert.match(html, /Last 24h/);
  assert.match(html, /Positive/);
  assert.match(html, /Neutral/);
  assert.match(html, /Negative/);
  assert.match(html, /Active users/);
  assert.match(html, /1,842/);
  assert.match(html, /Success rate/);
  assert.match(html, /92%/);
  assert.match(html, /Agent \/ Source/);
  assert.match(html, /Claude/);
  assert.match(html, /Cursor/);
  assert.match(html, /Showing 1-8 of 243/);
});
