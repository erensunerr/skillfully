import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

function fakeSkill(name = "demo-skill", id = "skill-1") {
  return {
    id,
    ownerId: "user-1",
    name,
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
  assert.doesNotMatch(html, /Skill health/i);
  assert.doesNotMatch(html, /Needs attention/i);
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
  assert.match(html, /Markdown editor/i);
  assert.match(html, /MDXEditor/i);
  assert.match(html, /When to use/);
  assert.match(html, /Workflow/);
  assert.match(html, /Skill standard passed/);
  assert.match(html, /Version history/);
  assert.doesNotMatch(html, /Publishing destinations/);
  assert.match(html, /Change publishing options/i);
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

test("dashboard skill detail renders the skill settings UI", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillDetail
      activeTab="settings"
      skill={fakeSkill()}
      entries={fakeEntries()}
      feedbackTemplate="Post feedback to {{feedbackUrl}}"
      feedbackTemplateError={null}
      onBack={() => undefined}
    />,
  );

  assert.match(html, /Persistent configuration for this skill/i);
  assert.match(html, /01\. General/i);
  assert.match(html, /Skill name/i);
  assert.match(html, /Slug/i);
  assert.match(html, /02\. Source/i);
  assert.match(html, /GitHub tracked/i);
  assert.match(html, /erensunerr\/demo-skill/i);
  assert.match(html, /03\. Publishing/i);
  assert.match(html, /Skillfully directory/i);
  assert.match(html, /04\. Tracking/i);
  assert.match(html, /Install endpoint/i);
  assert.match(html, /\/api\/install/i);
  assert.match(html, /05\. Danger zone/i);
  assert.match(html, /Delete skill/i);
});

test("dashboard renders the account settings UI", async () => {
  Object.assign(globalThis, { React });
  const { AccountSettingsWorkspace } = await import("./page");

  const html = renderToStaticMarkup(
    <AccountSettingsWorkspace
      user={{ email: "jane@acme.dev" } as never}
      isAccountMenuOpen={true}
      onToggleAccountMenu={() => undefined}
      onOpenAccountSettings={() => undefined}
      onSignOut={() => undefined}
    />,
  );

  assert.match(html, /Account Settings/i);
  assert.match(html, /Manage your profile, preferences, and data/i);
  assert.match(html, /Jane Developer/i);
  assert.match(html, /jane@acme\.dev/i);
  assert.match(html, /Preferences/i);
  assert.match(html, /System/i);
  assert.match(html, /Light/i);
  assert.match(html, /Dark/i);
  assert.match(html, /Default landing page/i);
  assert.match(html, /Security/i);
  assert.match(html, /Active sessions/i);
  assert.match(html, /Data &amp; Privacy/i);
  assert.match(html, /Export your data/i);
  assert.match(html, /Sign out/i);
});

test("dashboard route pages expose skill tab and account settings URLs", async () => {
  Object.assign(globalThis, { React });
  const dashboardPage = await import("./page");
  const skillTabPage = await import("./[skillId]/[tab]/page");
  const settingsPage = await import("./settings/page");

  const indexHtml = renderToStaticMarkup(<dashboardPage.default />);
  const tabHtml = renderToStaticMarkup(
    <skillTabPage.default params={{ skillId: "sk_demo123", tab: "analytics" }} />,
  );
  const settingsHtml = renderToStaticMarkup(<settingsPage.default />);

  assert.match(indexHtml, /data-dashboard-route="index"/);
  assert.match(tabHtml, /data-initial-skill-id="sk_demo123"/);
  assert.match(tabHtml, /data-initial-tab="analytics"/);
  assert.match(settingsHtml, /data-initial-tab="account"/);
});

test("dashboard renders the skill selector menu and create skill modal", async () => {
  Object.assign(globalThis, { React });
  const { SkillSelector, CreateSkillModal } = await import("./page");

  const html = renderToStaticMarkup(
    <>
      <SkillSelector
        skills={[
          fakeSkill("demo-skill", "skill-1"),
          fakeSkill("seo-audit", "skill-2"),
          fakeSkill("customer-support", "skill-3"),
        ]}
        selectedId="skill-1"
        isOpen={true}
        onToggle={() => undefined}
        onSelect={() => undefined}
        onCreateSkill={() => undefined}
      />
      <CreateSkillModal
        form={{ name: "", description: "" }}
        onChange={() => undefined}
        onCancel={() => undefined}
        onSubmit={() => undefined}
      />
    </>,
  );

  assert.match(html, /demo-skill/i);
  assert.match(html, /seo-audit/i);
  assert.match(html, /customer-support/i);
  assert.match(html, /Create new skill/i);
  assert.match(html, /Start a new skill in Skillfully/i);
  assert.match(html, /Skill name/i);
  assert.match(html, /e\.g\. billing-support/i);
  assert.match(html, /Import from GitHub/i);
});
