import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

function fakeSkill(name = "code-review", id = "skill-1") {
  return {
    id,
    ownerId: "user-1",
    name,
    description: "Reviews code changes for correctness and missing tests.",
    skillId: "sk_test123",
    createdAt: Date.now(),
  };
}

function fakeEntries() {
  return [
    {
      id: "feedback-1",
      ownerId: "user-1",
      skillId: "sk_test123",
      rating: "positive",
      feedback: "The checklist caught a missing migration.",
      createdAt: Date.now(),
    },
    {
      id: "feedback-2",
      ownerId: "user-1",
      skillId: "sk_test123",
      rating: "negative",
      feedback: "The review skipped the rollback path.",
      createdAt: Date.now() - 1000,
    },
  ] as never;
}

function fakeUsageEvents() {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  return [
    {
      id: "usage-1",
      ownerId: "user-1",
      skillId: "sk_test123",
      eventKind: "manifest_checked",
      versionId: "version-1",
      source: "public_manifest",
      subjectHash: "subject-1",
      dayKey: today,
      createdAt: now,
    },
    {
      id: "usage-2",
      ownerId: "user-1",
      skillId: "sk_test123",
      eventKind: "file_loaded",
      versionId: "version-1",
      path: "SKILL.md",
      source: "public_file",
      subjectHash: "subject-1",
      dayKey: today,
      createdAt: now - 1000,
    },
    {
      id: "usage-3",
      ownerId: "user-1",
      skillId: "sk_test123",
      eventKind: "public_page_view",
      versionId: "version-1",
      source: "public_skill_page",
      dayKey: today,
      createdAt: now - 2000,
    },
  ] as never;
}

test("dashboard does not render seeded demo data for an empty skill", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail, AccountSettingsWorkspace } = await import("./page");
  const skill = {
    ...fakeSkill("release-check", "skill-empty"),
    description: "",
    skillId: "sk_empty123",
  } as never;

  const overviewHtml = renderToStaticMarkup(
    <SkillDetail
      skill={skill}
      entries={[] as never}
      feedbackTemplate="Post feedback to {{feedbackUrl}}"
      feedbackTemplateError={null}
      onBack={() => undefined}
    />,
  );
  const editorHtml = renderToStaticMarkup(
    <SkillDetail
      activeTab="editor"
      skill={skill}
      entries={[] as never}
      feedbackTemplate="Post feedback to {{feedbackUrl}}"
      feedbackTemplateError={null}
      onBack={() => undefined}
    />,
  );
  const analyticsHtml = renderToStaticMarkup(
    <SkillDetail
      activeTab="analytics"
      skill={skill}
      entries={[] as never}
      feedbackTemplate="Post feedback to {{feedbackUrl}}"
      feedbackTemplateError={null}
      onBack={() => undefined}
    />,
  );
  const settingsHtml = renderToStaticMarkup(
    <SkillDetail
      activeTab="settings"
      skill={skill}
      entries={[] as never}
      feedbackTemplate="Post feedback to {{feedbackUrl}}"
      feedbackTemplateError={null}
      onBack={() => undefined}
    />,
  );
  const accountHtml = renderToStaticMarkup(
    <AccountSettingsWorkspace
      user={{} as never}
      isAccountMenuOpen={true}
      onToggleAccountMenu={() => undefined}
      onOpenAccountSettings={() => undefined}
      onSignOut={() => undefined}
    />,
  );

  const html = [overviewHtml, editorHtml, analyticsHtml, settingsHtml, accountHtml].join("\n");
  [
    /Great job!/i,
    /v2\.3\.0/i,
    /May 12, 2025/i,
    /Showing 1-8 of 243/i,
    /1,842/i,
    /2,304/i,
    /94\.8%/i,
    /Jane Developer/i,
    /jane@acme\.dev/i,
    /seo-audit/i,
    /customer-support/i,
    /assets\/logo\.png/i,
    /faq\.pdf/i,
    /erensunerr\/release-check/i,
    /\/api\/install/i,
  ].forEach((pattern) => assert.doesNotMatch(html, pattern));

  assert.match(html, /No feedback yet/i);
  assert.match(html, /No usage data yet/i);
  assert.match(html, /Version history appears after the first publish/i);
});

test("dashboard skill detail renders the operational overview UI", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillDetail
      skill={fakeSkill()}
      entries={fakeEntries()}
      usageEvents={fakeUsageEvents()}
      feedbackTemplate="Post feedback to {{feedbackUrl}}"
      feedbackTemplateError={null}
      onBack={() => undefined}
    />,
  );

  assert.match(html, /code-review/);
  assert.match(html, /Not versioned/);
  assert.match(html, /Draft/);
  assert.match(html, /Go to Editor/);
  assert.match(html, /Copy installation prompt/);
  assert.match(html, /Success rate/i);
  assert.match(html, /Feedback received/i);
  assert.match(html, /Usage events/i);
  assert.match(html, /1 update check \/ 1 file load/i);
  assert.match(html, /Usage over time/i);
  assert.match(html, /Total events/i);
  assert.match(html, /Event mix/i);
  assert.match(html, /Public page views/i);
  assert.match(html, /Update checks/i);
  assert.match(html, /File loads/i);
  assert.doesNotMatch(html, /No usage data yet/i);
  assert.doesNotMatch(html, /Skill health/i);
  assert.doesNotMatch(html, /Needs attention/i);
  assert.match(html, /Feedback sentiment/i);
  assert.match(html, /Recent feedback/i);
  assert.match(html, /Publishing &amp; directory status/i);
  assert.match(html, /LobeHub Skills/i);
  assert.match(html, /ClawHub/i);
  assert.match(html, /Hermes Skills Hub/i);
  assert.doesNotMatch(html, /agentskills\.io/i);
  assert.match(html, /Version snapshot/i);
  assert.match(html, /No published versions yet/i);
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
  assert.match(html, /Collapse files/);
  assert.match(html, /Collapse frontmatter/);
  assert.doesNotMatch(html, /Validate skill/);
  assert.match(html, /Upload file/);
  assert.match(html, /Markdown files \(editable\)/i);
  assert.match(html, /SKILL\.md/);
  assert.match(html, /No assets uploaded/);
  assert.match(html, /Markdown editor/i);
  assert.match(html, /MDXEditor/i);
  assert.match(html, /When to use/);
  assert.match(html, /Workflow/);
  assert.match(html, /SKILL\.md present/);
  assert.match(html, /Version history/);
  assert.match(html, /Version history appears after the first publish/);
  assert.doesNotMatch(html, /Publishing destinations/);
  assert.match(html, /Change publishing options/i);
  assert.match(html, /Publish version/);
  assert.doesNotMatch(html, /Save changes/);
  assert.doesNotMatch(html, /Saving automatically/i);
  assert.doesNotMatch(html, /Autosaves to Skillfully/i);
  assert.doesNotMatch(html, /Skillfully feedback and update instructions/i);
  assert.doesNotMatch(html, /Install skill prompt/);
});

test("dashboard skill detail renders the analytics tab UI", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillDetail
      activeTab="analytics"
      skill={fakeSkill()}
      entries={fakeEntries()}
      usageEvents={fakeUsageEvents()}
      feedbackTemplate="Post feedback to {{feedbackUrl}}"
      feedbackTemplateError={null}
      onBack={() => undefined}
    />,
  );

  assert.match(html, /Search feedback/);
  assert.match(html, /Last 24h/);
  assert.match(html, /Positive/);
  assert.match(html, /Neutral/);
  assert.match(html, /Negative/);
  assert.match(html, /Feedback received/);
  assert.match(html, /Positive rate/);
  assert.match(html, /Usage events/);
  assert.match(html, /Update checks/);
  assert.match(html, /50%/);
  assert.match(html, /Runtime events/);
  assert.match(html, /1 file loads/);
  assert.match(html, /Public page views/);
  assert.match(html, /public_skill_page/);
  assert.match(html, /Update checks/);
  assert.match(html, /public_manifest/);
  assert.match(html, /File loads/);
  assert.match(html, /SKILL\.md/);
  assert.match(html, /Agent \/ Source/);
  assert.match(html, /Feedback API/);
  assert.match(html, /The checklist caught a missing migration/);
  assert.match(html, /Showing 2 of 2/);
  assert.doesNotMatch(html, /Claude/);
  assert.doesNotMatch(html, /Cursor/);
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
  assert.match(html, /Managed in GitHub/i);
  assert.match(html, /Skillfully managed repository/i);
  assert.match(html, /skills\/code-review/i);
  assert.match(html, /03\. Publishing/i);
  assert.match(html, /LobeHub Skills/i);
  assert.match(html, /ClawHub/i);
  assert.match(html, /Hermes Skills Hub/i);
  assert.doesNotMatch(html, /agentskills\.io/i);
  assert.match(html, /04\. Tracking/i);
  assert.match(html, /Manifest endpoint/i);
  assert.match(html, /\/api\/public\/skills\/sk_test123\/manifest/i);
  assert.match(html, /\/feedback\/sk_test123/i);
  assert.doesNotMatch(html, /\/api\/install/i);
  assert.match(html, /05\. Danger zone/i);
  assert.match(html, /Delete skill/i);
});

test("dashboard settings show imported skills as managed in GitHub", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillDetail
      activeTab="settings"
      skill={{
        ...fakeSkill(),
        sourceMode: "github_import",
        originalRepoFullName: "octocat/Hello-World",
        originalSkillPath: ".agents/skills/code-review",
      } as never}
      entries={fakeEntries()}
      feedbackTemplate="Post feedback to {{feedbackUrl}}"
      feedbackTemplateError={null}
      onBack={() => undefined}
    />,
  );

  assert.match(html, /Managed in GitHub/i);
  assert.match(html, /octocat\/Hello-World/i);
  assert.match(html, /\.agents\/skills\/code-review/i);
  assert.match(html, /Create pull request on publish/i);
});

test("dashboard renders the account settings UI", async () => {
  Object.assign(globalThis, { React });
  const { AccountSettingsWorkspace } = await import("./page");

  const html = renderToStaticMarkup(
    <AccountSettingsWorkspace
      user={{ email: "member@example.com" } as never}
      isAccountMenuOpen={true}
      onToggleAccountMenu={() => undefined}
      onOpenAccountSettings={() => undefined}
      onSignOut={() => undefined}
    />,
  );

  assert.match(html, /Account Settings/i);
  assert.match(html, /Manage your profile, preferences, and data/i);
  assert.match(html, /Member/i);
  assert.match(html, /member@example\.com/i);
  assert.match(html, /Preferences/i);
  assert.match(html, /System/i);
  assert.match(html, /Light/i);
  assert.match(html, /Dark/i);
  assert.match(html, /Default landing page/i);
  assert.match(html, /Security/i);
  assert.match(html, /Active sessions/i);
  assert.match(html, /Current session/i);
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
    <skillTabPage.default params={{ skillId: "sk_test123", tab: "analytics" }} />,
  );
  const settingsHtml = renderToStaticMarkup(<settingsPage.default />);

  assert.match(indexHtml, /data-dashboard-route="index"/);
  assert.match(tabHtml, /data-initial-skill-id="sk_test123"/);
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
          fakeSkill("code-review", "skill-1"),
          fakeSkill("write-tests", "skill-2"),
          fakeSkill("release-check", "skill-3"),
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
        onImportFromGitHub={() => undefined}
      />
    </>,
  );

  assert.match(html, /code-review/i);
  assert.match(html, /write-tests/i);
  assert.match(html, /release-check/i);
  assert.match(html, /Create new skill/i);
  assert.match(html, /Start a new skill in Skillfully/i);
  assert.match(html, /Skill name/i);
  assert.match(html, /e\.g\. code-review/i);
  assert.match(html, /Import from GitHub/i);
  assert.match(html, /data-github-import-action="\/api\/github\/install"/i);
});
