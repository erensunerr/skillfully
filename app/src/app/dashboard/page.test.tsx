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
    visibility: "private",
    createdAt: Date.now(),
    accessLevel: "owner" as const,
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
      onBack={() => undefined}
    />,
  );
  const editorHtml = renderToStaticMarkup(
    <SkillDetail
      activeTab="editor"
      skill={skill}
      entries={[] as never}
      onBack={() => undefined}
    />,
  );
  const analyticsHtml = renderToStaticMarkup(
    <SkillDetail
      activeTab="analytics"
      skill={skill}
      entries={[] as never}
      onBack={() => undefined}
    />,
  );
  const settingsHtml = renderToStaticMarkup(
    <SkillDetail
      activeTab="settings"
      skill={skill}
      entries={[] as never}
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
  assert.doesNotMatch(html, /Version history appears after the first publish/i);
});

test("dashboard skill detail renders the operational overview UI", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillDetail
      skill={fakeSkill()}
      entries={fakeEntries()}
      usageEvents={fakeUsageEvents()}
      onBack={() => undefined}
    />,
  );

  assert.match(html, /code-review/);
  assert.match(html, /Not versioned/);
  assert.match(html, /Draft/);
  assert.match(html, /Go to Editor/);
  assert.match(html, /Install Skillfully Skill/);
  assert.doesNotMatch(html, /Install code-review/);
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
  assert.match(html, /Private Skillfully release/i);
  assert.doesNotMatch(html, /LobeHub Skills/i);
  assert.doesNotMatch(html, /ClawHub/i);
  assert.doesNotMatch(html, /Hermes Skills Hub/i);
  assert.doesNotMatch(html, /agentskills\.io/i);
  assert.match(html, /Version snapshot/i);
  assert.match(html, /No published versions yet/i);
});

test("published dashboard overview renders both install prompt actions", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillDetail
      skill={{
        ...fakeSkill(),
        publishedVersionId: "version-1",
        status: "published",
      } as never}
      entries={fakeEntries()}
      usageEvents={fakeUsageEvents()}
      onBack={() => undefined}
    />,
  );

  assert.match(html, /Published version/);
  assert.match(html, /Install Skillfully Skill/);
  assert.match(html, /Install code-review/);
});

test("dashboard skill detail renders the editor tab UI with rails closed by default", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillDetail
      activeTab="editor"
      skill={fakeSkill()}
      entries={fakeEntries()}
      onBack={() => undefined}
    />,
  );

  assert.match(html, /Files/);
  assert.match(html, /Frontmatter/);
  assert.match(html, /Expand files/);
  assert.match(html, /Expand frontmatter/);
  assert.doesNotMatch(html, /aria-readonly="true"/);
  assert.doesNotMatch(html, /Collapse files/);
  assert.doesNotMatch(html, /Collapse frontmatter/);
  assert.doesNotMatch(html, /Validate skill/);
  assert.doesNotMatch(html, /Upload file/);
  assert.doesNotMatch(html, /New markdown file/i);
  assert.doesNotMatch(html, /Create markdown file/i);
  assert.doesNotMatch(html, /Markdown files \(editable\)/i);
  assert.match(html, /SKILL\.md/);
  assert.doesNotMatch(html, /No assets uploaded/);
  assert.match(html, /Markdown editor/i);
  assert.match(html, /MDXEditor/i);
  assert.doesNotMatch(html, /The user asks for work that this skill is designed to handle/);
  assert.doesNotMatch(html, /When to use/);
  assert.doesNotMatch(html, /Workflow/);
  assert.doesNotMatch(html, /SKILL\.md present/);
  assert.doesNotMatch(html, /Version history/);
  assert.doesNotMatch(html, /Version history appears after the first publish/);
  assert.doesNotMatch(html, />Version<\/span>/);
  assert.doesNotMatch(html, /0\.1\.0/);
  assert.doesNotMatch(html, /Publishing destinations/);
  assert.match(html, /Change publishing options/i);
  assert.match(html, /Publish version/);
  assert.doesNotMatch(html, /Save changes/);
  assert.doesNotMatch(html, /Saving automatically/i);
  assert.doesNotMatch(html, /Autosaves to Skillfully/i);
  assert.doesNotMatch(html, /Skillfully feedback and update instructions/i);
  assert.doesNotMatch(html, /Install skill prompt/);
});

test("dashboard editor only opens markdown files in the markdown editor", async () => {
  const { isEditableSkillFile } = await import("./page");

  assert.equal(isEditableSkillFile({
    path: "SKILL.md",
    kind: "markdown",
    mimeType: "text/markdown",
  }), true);
  assert.equal(isEditableSkillFile({
    path: "references/directory-list.md",
    kind: "asset",
    mimeType: "application/octet-stream",
  }), true);
  assert.equal(isEditableSkillFile({
    path: "references/submission-tracker-template.csv",
    kind: "text",
    mimeType: "text/plain",
  }), false);
  assert.equal(isEditableSkillFile({
    path: "evals/evals.json",
    kind: "json",
    mimeType: "application/json",
  }), false);
});

test("dashboard markdown editor enables fenced code block support", async () => {
  const { CODE_BLOCK_LANGUAGES } = await import("./mdx-editor-client");

  assert.equal(CODE_BLOCK_LANGUAGES.typescript, "TypeScript");
  assert.equal(CODE_BLOCK_LANGUAGES.tsx, "TSX");
  assert.equal(CODE_BLOCK_LANGUAGES.bash, "Bash");
  assert.equal(CODE_BLOCK_LANGUAGES.json, "JSON");
});

test("GitHub import failures attach to matching candidate rows", async () => {
  const { applyGitHubImportFailuresToCandidates } = await import("./page");

  const result = applyGitHubImportFailuresToCandidates({
    candidates: [
      {
        id: "candidate-steps",
        repoFullName: "octocat/Hello-World",
        skillName: "steps",
        skillRoot: "skills/steps",
        status: "valid",
      },
      {
        id: "candidate-code-review",
        repoFullName: "octocat/Hello-World",
        skillName: "code-review",
        skillRoot: "skills/code-review",
        status: "valid",
      },
    ],
    selectedCandidateIds: new Set(["candidate-steps", "candidate-code-review"]),
    failures: [
      {
        candidate_id: "candidate-steps",
        name: "steps",
        error: "Validation failed for steps: Attributes are missing in your schema",
      },
    ],
  });

  assert.equal(result.candidates[0].status, "invalid");
  assert.equal(
    result.candidates[0].reason,
    "Validation failed for steps: Attributes are missing in your schema",
  );
  assert.equal(result.candidates[1].status, "valid");
  assert.deepEqual([...result.selectedCandidateIds], ["candidate-code-review"]);
});

test("dashboard selector marks shared skills", async () => {
  Object.assign(globalThis, { React });
  const { SkillSelector } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillSelector
      skills={[
        fakeSkill("owned-skill", "owned") as never,
        { ...fakeSkill("shared-skill", "shared"), accessLevel: "use", ownerEmail: "owner@example.com" } as never,
      ]}
      selectedId="shared"
      isOpen={true}
      onToggle={() => undefined}
      onSelect={() => undefined}
      onCreateSkill={() => undefined}
    />,
  );

  assert.match(html, /shared-skill/);
  assert.match(html, /Shared/);
  assert.match(html, /Use only/);
});

test("dashboard selector constrains the skill row list when open", async () => {
  Object.assign(globalThis, { React });
  const { SkillSelector } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillSelector
      skills={Array.from({ length: 16 }, (_, index) =>
        fakeSkill(`skill-${index + 1}`, `skill-${index + 1}`),
      ) as never}
      selectedId="skill-1"
      isOpen={true}
      onToggle={() => undefined}
      onSelect={() => undefined}
      onCreateSkill={() => undefined}
    />,
  );

  assert.match(html, /max-h-\[/);
  assert.match(html, /overflow-y-auto/);
  assert.match(html, /overscroll-contain/);
  assert.match(html, /Create new skill/);
});

test("use-only shared skill hides editor analytics settings and share controls", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail } = await import("./page");

  const skill = {
    ...fakeSkill("shared-use", "shared-use"),
    accessLevel: "use",
    publishedVersionId: "version-1",
    status: "published",
  } as never;
  const overviewHtml = renderToStaticMarkup(
    <SkillDetail
      skill={skill}
      entries={[] as never}
      activeTab="overview"
      onBack={() => undefined}
    />,
  );
  const editorHtml = renderToStaticMarkup(
    <SkillDetail
      skill={skill}
      entries={[] as never}
      activeTab="editor"
      onBack={() => undefined}
    />,
  );

  assert.match(overviewHtml, /Shared/);
  assert.match(overviewHtml, /Use only/);
  assert.doesNotMatch(overviewHtml, /Go to Editor/);
  assert.doesNotMatch(editorHtml, /Markdown editor/i);
  assert.doesNotMatch(editorHtml, />Share</);
});

test("edit shared skill keeps authoring tabs and share button visible", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillDetail
      skill={{ ...fakeSkill("shared-edit", "shared-edit"), accessLevel: "edit" } as never}
      entries={[] as never}
      activeTab="editor"
      onBack={() => undefined}
    />,
  );

  assert.match(html, /Markdown editor/i);
  assert.match(html, /Share/);
});

test("share dialog shows private link-use checkbox only for private skills", async () => {
  Object.assign(globalThis, { React });
  const { SkillShareDialog } = await import("./page");

  const privateHtml = renderToStaticMarkup(
    <SkillShareDialog
      skill={{ ...fakeSkill(), anyoneWithLinkCanUse: true } as never}
      user={{ id: "user-1", email: "owner@example.com" } as never}
      onSkillUpdated={() => undefined}
      onClose={() => undefined}
    />,
  );
  const publicHtml = renderToStaticMarkup(
    <SkillShareDialog
      skill={{ ...fakeSkill("public-skill"), visibility: "public", anyoneWithLinkCanUse: true } as never}
      user={{ id: "user-1", email: "owner@example.com" } as never}
      onSkillUpdated={() => undefined}
      onClose={() => undefined}
    />,
  );

  assert.match(privateHtml, /Anyone with link can use\./);
  assert.match(privateHtml, /Disable link access to revoke the current link\./);
  assert.match(privateHtml, /type="checkbox"/);
  assert.match(privateHtml, /cursor-pointer/);
  assert.match(privateHtml, /checked=""/);
  assert.doesNotMatch(publicHtml, /Anyone with link can use\./);
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

test("analytics usage rows keep duplicate-looking events keyed uniquely", async () => {
  Object.assign(globalThis, { React });
  const { analyticsRowsFromUsageEvents } = await import("./page");
  const createdAt = Date.UTC(2026, 4, 11, 17, 11);

  const rows = analyticsRowsFromUsageEvents([
    {
      id: "usage-a",
      ownerId: "user-1",
      skillId: "sk_test123",
      eventKind: "manifest_checked",
      source: "public_manifest",
      subjectHash: "cb2d9b80-08b6-4803-a6fb-cae14761a386",
      dayKey: "2026-05-11",
      createdAt,
    },
    {
      id: "usage-b",
      ownerId: "user-1",
      skillId: "sk_test123",
      eventKind: "manifest_checked",
      source: "public_manifest",
      subjectHash: "cb2d9b80-08b6-4803-a6fb-cae14761a386",
      dayKey: "2026-05-11",
      createdAt,
    },
  ] as never);

  assert.deepEqual(rows.map((row) => row.rowKey), ["usage-a", "usage-b"]);
});

test("dashboard skill detail renders the skill settings UI", async () => {
  Object.assign(globalThis, { React });
  const { SkillDetail } = await import("./page");

  const html = renderToStaticMarkup(
    <SkillDetail
      activeTab="settings"
      skill={fakeSkill()}
      entries={fakeEntries()}
      onBack={() => undefined}
    />,
  );

  assert.match(html, /Persistent configuration for this skill/i);
  assert.match(html, /01\. General/i);
  assert.match(html, /Skill name/i);
  assert.match(html, /Slug/i);
  assert.match(html, /Visibility/i);
  assert.match(html, /Private/i);
  assert.match(html, /Public/i);
  assert.doesNotMatch(html, /Archive skill/i);
  assert.match(html, /02\. Source/i);
  assert.match(html, /Managed in GitHub/i);
  assert.match(html, /Skillfully storage/i);
  assert.match(html, /Private manifest and files/i);
  assert.doesNotMatch(html, /Only for GitHub-managed skills/i);
  assert.doesNotMatch(html, /Not used/i);
  assert.match(html, /Private publishes are served by Skillfully only/i);
  assert.match(html, /03\. Publishing/i);
  assert.match(html, /Private Skillfully release/i);
  assert.doesNotMatch(html, /LobeHub Skills/i);
  assert.doesNotMatch(html, /ClawHub/i);
  assert.doesNotMatch(html, /Hermes Skills Hub/i);
  assert.doesNotMatch(html, /agentskills\.io/i);
  assert.match(html, /04\. Tracking/i);
  assert.match(html, /Manifest endpoint/i);
  assert.match(html, /\/api\/skills\/sk_test123\/manifest/i);
  assert.match(html, /\/feedback\/sk_test123/i);
  assert.doesNotMatch(html, /\/api\/install/i);
  assert.match(html, /05\. Danger zone/i);
  assert.doesNotMatch(html, /Reset analytics/i);
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
        visibility: "public",
        sourceMode: "github_import",
        originalRepoFullName: "octocat/Hello-World",
        originalSkillPath: ".agents/skills/code-review",
      } as never}
      entries={fakeEntries()}
      onBack={() => undefined}
    />,
  );

  assert.match(html, /Managed in GitHub/i);
  assert.match(html, /octocat\/Hello-World/i);
  assert.match(html, /\.agents\/skills\/code-review/i);
  assert.match(html, /Create pull request on publish/i);
  assert.match(html, /Create PR on publish/i);
  assert.match(html, /GitHub is the source of truth for this skill/i);
});

test("publish modal explains public and private release scope", async () => {
  Object.assign(globalThis, { React });
  const { PublishSkillModal } = await import("./page");

  const privateHtml = renderToStaticMarkup(
    <PublishSkillModal
      step="confirm"
      skillName="private-skill"
      visibility="private"
      installPrompt="install"
      installPromptCopied={false}
      isPublishing={false}
      publishError=""
      onCancel={() => undefined}
      onConfirm={() => undefined}
      onCopyInstallPrompt={() => undefined}
      onContinueAfterMerge={() => undefined}
      onContinueToInstallCheck={() => undefined}
      onFinish={() => undefined}
    />,
  );
  const publicHtml = renderToStaticMarkup(
    <PublishSkillModal
      step="confirm"
      skillName="public-skill"
      visibility="public"
      installPrompt="install"
      installPromptCopied={false}
      isPublishing={false}
      publishError=""
      onCancel={() => undefined}
      onConfirm={() => undefined}
      onCopyInstallPrompt={() => undefined}
      onContinueAfterMerge={() => undefined}
      onContinueToInstallCheck={() => undefined}
      onFinish={() => undefined}
    />,
  );

  assert.match(privateHtml, /people with use or edit access/i);
  assert.doesNotMatch(privateHtml, /publicly accessible/i);
  assert.match(publicHtml, /publicly accessible/i);
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

test("dashboard sidebar guide action opens the skills guide in a new tab", async () => {
  Object.assign(globalThis, { React });
  const { DashboardSidebar } = await import("./page");

  const html = renderToStaticMarkup(
    <DashboardSidebar
      user={{ email: "member@example.com" } as never}
      skills={[fakeSkill() as never]}
      selectedId="skill-1"
      activeTab="overview"
      isSkillSelectorOpen={false}
      onSelect={() => undefined}
      onTabChange={() => undefined}
      onToggleSkillSelector={() => undefined}
      onOpenCreateSkill={() => undefined}
      onSignOut={() => undefined}
    />,
  );

  assert.match(html, /Open Guide/);
  assert.match(html, /href="\/guide\/start-with-agent-skills"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noreferrer"/);
});

test("publish modal renders a busy state while publishing", async () => {
  Object.assign(globalThis, { React });
  const { PublishSkillModal } = await import("./page");

  const html = renderToStaticMarkup(
    <PublishSkillModal
      step="confirm"
      skillName="code-review"
      visibility="public"
      installPrompt="Install prompt"
      installPromptCopied={false}
      isPublishing={true}
      publishError=""
      onCancel={() => undefined}
      onConfirm={() => undefined}
      onCopyInstallPrompt={() => undefined}
      onContinueAfterMerge={() => undefined}
      onContinueToInstallCheck={() => undefined}
      onFinish={() => undefined}
    />,
  );

  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Publishing can take a few seconds/i);
  assert.match(html, /Publishing\.\.\./);
  assert.match(html, /disabled=""/);
});

test("publish modal tells GitHub-managed users to merge the PR before install", async () => {
  Object.assign(globalThis, { React });
  const { PublishSkillModal } = await import("./page");

  const html = renderToStaticMarkup(
    <PublishSkillModal
      step="merge"
      skillName="code-review"
      visibility="public"
      installPrompt="Install prompt"
      installPromptCopied={false}
      isPublishing={false}
      publishError=""
      pullRequestUrl="https://github.com/octocat/Hello-World/pull/42"
      onCancel={() => undefined}
      onConfirm={() => undefined}
      onCopyInstallPrompt={() => undefined}
      onContinueAfterMerge={() => undefined}
      onContinueToInstallCheck={() => undefined}
      onFinish={() => undefined}
    />,
  );

  assert.match(html, /Merge the GitHub pull request/i);
  assert.match(html, /https:\/\/github\.com\/octocat\/Hello-World\/pull\/42/);
  assert.match(html, /before installing/i);
  assert.doesNotMatch(html, /Copy installation prompt/i);
});

test("installation confirmation waits for install or feedback endpoint usage", async () => {
  const { hasInstallationConfirmation } = await import("./page");
  const startedAt = Date.UTC(2026, 4, 19, 12, 0);

  assert.equal(hasInstallationConfirmation([
    { eventKind: "manifest_checked", createdAt: startedAt + 1000 },
    { eventKind: "skill_installed", createdAt: startedAt - 1 },
  ] as never, startedAt), false);
  assert.equal(hasInstallationConfirmation([
    { eventKind: "skill_installed", createdAt: startedAt + 1000 },
  ] as never, startedAt), true);
  assert.equal(hasInstallationConfirmation([
    { eventKind: "feedback_received", createdAt: startedAt + 1000 },
  ] as never, startedAt), true);
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
});
