# Private Skill Sharing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add private skill sharing with `use` and `edit` permissions for people and their connected agents, backed by one shared access layer and served through unified install routes.

**Architecture:** Keep the existing dashboard-route and agent-route split, but move all permission decisions into `app/src/lib/skills/access.ts`. Route handlers authenticate the caller, call the shared service, and serialize results. Skill releases remain immutable; visibility and access grants decide who can retrieve them.

**Tech Stack:** Next.js App Router, React 19, InstantDB schema/perms/admin SDK, Node test runner with `tsx`, Resend, existing Skillfully repository/publishing helpers.

---

## Baseline

Current baseline was verified from `app/` before writing this plan:

```bash
npm test
```

Expected and observed: `81` tests passing, `0` failing.

The worktree had an existing unrelated `app/package-lock.json` modification before this plan. Do not revert it. When the Resend dependency task runs, re-read `app/package.json` and `app/package-lock.json` immediately before using `npm install resend`.

## File Map

- Create `app/src/lib/skills/access.ts`: shared access service for resolving, granting, listing, and revoking skill access.
- Create `app/src/lib/skills/access.test.ts`: unit tests for owner/edit/use/revoked/email grant rules.
- Create `app/src/lib/email/resend.ts`: small Resend email adapter with dependency injection friendly API.
- Create `app/src/lib/email/resend.test.ts`: tests for best-effort invite delivery behavior without calling Resend.
- Modify `app/src/instant.schema.ts`: add `skillAccessGrants`, `skillInviteNotifications`, and integer release fields if needed.
- Modify `app/src/instant.perms.ts`: keep new privileged entities locked down unless a client query needs explicit safe fields.
- Modify `app/src/lib/skills/repository.ts`: support integer release numbers and access-aware lookup helpers.
- Modify `app/src/lib/skills/repository.test.ts`: update release/version expectations.
- Modify `app/src/lib/skills/skill-files.ts`: move generated manifest URLs to `/api/skills/...`.
- Modify `app/src/lib/skills/skill-files.test.ts`: update manifest URL expectations.
- Modify `app/src/lib/skills/install-prompts.ts`: use unified install URLs and authenticated private wording where needed.
- Modify `app/src/lib/skills/install-prompts.test.ts`: update prompt expectations.
- Create `app/src/app/api/skills/[skillId]/manifest/route.ts`: unified public/private manifest route.
- Create `app/src/app/api/skills/[skillId]/files/[...path]/route.ts`: unified public/private file route.
- Create `app/src/app/api/skills/[skillId]/install/route.ts`: unified install analytics route.
- Modify `app/src/app/api/public/skills/[skillId]/*/route.ts`: keep public-only wrappers for compatibility.
- Create `app/src/app/api/skills/[skillId]/route.test.ts`: route tests for unified install access behavior.
- Create `app/src/app/api/dashboard/skills/[skillId]/access/route.ts`: dashboard list/grant route.
- Create `app/src/app/api/dashboard/skills/[skillId]/access/[grantId]/route.ts`: dashboard update/revoke route.
- Create `app/src/app/api/agent/skills/[skillId]/access/route.ts`: agent list/grant route.
- Create `app/src/app/api/agent/skills/[skillId]/access/[grantId]/route.ts`: agent revoke route.
- Create or extend route tests under `app/src/app/api/dashboard/skills/[skillId]/access/` and `app/src/app/api/agent/skills/[skillId]/access/`.
- Modify `app/src/app/api/dashboard/skills/*` and `app/src/app/api/agent/skills/*`: replace owner-only checks with shared edit/use access where appropriate.
- Modify `app/src/app/dashboard/page.tsx`: shared skill markers, use-only restricted surface, editor-panel Share button/dialog.
- Modify `app/src/app/dashboard/page.test.tsx`: rendering tests for shared markers and hidden use-only surfaces.
- Modify `app/src/app/dashboard/view-state.ts` and `app/src/app/dashboard/view-state.test.ts` if route gating needs a pure helper.
- Modify `skills/skillfully/SKILL.md`: document agent list/resolve/share/revoke workflows.
- Modify `app/package.json` and `app/package-lock.json`: add `resend` through `npm install resend`.

## Chunk 1: Access Data And Shared Service

### Task 1: Add Resend Dependency

**Files:**
- Modify: `app/package.json`
- Modify: `app/package-lock.json`

- [ ] **Step 1: Re-read dependency files**

Run:

```bash
git status --short
sed -n '1,220p' app/package.json
```

Expected: note any existing `app/package-lock.json` modifications and do not revert them.

- [ ] **Step 2: Install Resend with npm**

Run:

```bash
cd app && npm install resend
```

Expected: `resend` appears in `dependencies`; lockfile updates are produced by npm, not hand-edited.

- [ ] **Step 3: Verify package metadata**

Run:

```bash
node -e "const p=require('./app/package.json'); console.log(p.dependencies.resend)"
```

Expected: prints the installed version string.

- [ ] **Step 4: Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "chore: add resend for invite emails"
git push
```

### Task 2: Add Instant Schema And Permissions For Sharing

**Files:**
- Modify: `app/src/instant.schema.ts`
- Modify: `app/src/instant.perms.ts`

- [ ] **Step 1: Write schema update**

In `app/src/instant.schema.ts`, add indexed entities:

```ts
skillAccessGrants: i.entity({
  ownerId: i.string().indexed(),
  skillId: i.string().indexed(),
  granteeEmail: i.string().indexed(),
  granteeUserId: i.string().indexed().optional(),
  permission: i.string().indexed(),
  status: i.string().indexed(),
  createdByUserId: i.string().indexed(),
  revokedByUserId: i.string().indexed().optional(),
  createdAt: i.number().indexed(),
  updatedAt: i.number().indexed(),
  revokedAt: i.number().indexed().optional(),
}),
skillInviteNotifications: i.entity({
  ownerId: i.string().indexed(),
  skillId: i.string().indexed(),
  grantId: i.string().indexed(),
  toEmail: i.string().indexed(),
  fromUserId: i.string().indexed(),
  deliveryStatus: i.string().indexed(),
  resendEmailId: i.string().indexed().optional(),
  error: i.string().optional(),
  createdAt: i.number().indexed(),
  updatedAt: i.number().indexed(),
}),
```

For integer releases, prefer adding `versionNumber: i.number().indexed().optional()` to `skillVersions` while keeping `version` for backwards compatibility.

- [ ] **Step 2: Write permissions update**

In `app/src/instant.perms.ts`, add locked-down rules:

```ts
skillAccessGrants: {
  allow: {
    view: "false",
    create: "false",
    update: "false",
    delete: "false",
  },
},
skillInviteNotifications: {
  allow: {
    view: "false",
    create: "false",
    update: "false",
    delete: "false",
  },
},
```

Route handlers will use the admin SDK. Do not expose share-list rows directly to use-only users.

- [ ] **Step 3: Run typecheck**

Run:

```bash
cd app && npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/src/instant.schema.ts app/src/instant.perms.ts
git commit -m "feat: add skill sharing schema"
git push
```

### Task 3: Build Shared Access Service With Tests

**Files:**
- Create: `app/src/lib/skills/access.ts`
- Create: `app/src/lib/skills/access.test.ts`

- [ ] **Step 1: Write failing access tests**

Create `app/src/lib/skills/access.test.ts` with an in-memory store matching the existing repository test style. Cover:

```ts
test("owner has implicit edit and use access", async () => { /* resolve owner */ });
test("edit grants imply use and can manage sharing", async () => { /* grant edit */ });
test("use grants do not allow edit or share management", async () => { /* grant use */ });
test("revoked grants resolve as none", async () => { /* revoke */ });
test("editors cannot revoke the owner", async () => { /* assert rejects */ });
test("email grants work before granteeUserId is known", async () => { /* match by normalized email */ });
```

Expected access result shape:

```ts
{
  level: "owner" | "edit" | "use" | "none";
  skill: SkillRow | null;
  ownerId?: string;
}
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd app && npm test -- src/lib/skills/access.test.ts
```

Expected: FAIL because `app/src/lib/skills/access.ts` does not exist.

- [ ] **Step 3: Implement access service**

Implement `app/src/lib/skills/access.ts` with:

```ts
export type SkillAccessLevel = "owner" | "edit" | "use" | "none";
export type SkillPermission = "use" | "edit";
export type SkillGrantStatus = "active" | "revoked";

export type SkillAccessGrantRow = {
  id: string;
  ownerId: string;
  skillId: string;
  granteeEmail: string;
  granteeUserId?: string;
  permission: SkillPermission;
  status: SkillGrantStatus;
  createdByUserId: string;
  revokedByUserId?: string;
  createdAt: number;
  updatedAt: number;
  revokedAt?: number;
};
```

Core behavior:

- normalize emails with `trim().toLowerCase()`;
- load the skill by `skillId`;
- owner resolves as `owner`;
- active `edit` grant resolves as `edit`;
- active `use` grant resolves as `use`;
- revoked grants are ignored;
- `requireSkillEditAccess` accepts `owner` and `edit`;
- `requireSkillUseAccess` accepts `owner`, `edit`, and `use`;
- `grantSkillAccess` upserts by `{ skillId, granteeEmail }`, reactivating revoked grants;
- `revokeSkillAccess` rejects owner access and marks grants revoked instead of deleting.

Use dependency injection:

```ts
export type SkillAccessStore = Pick<SkillStore, "query" | "create" | "update" | "transact">;
```

- [ ] **Step 4: Run access tests**

Run:

```bash
cd app && npm test -- src/lib/skills/access.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run repository tests**

Run:

```bash
cd app && npm test -- src/lib/skills/repository.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/skills/access.ts app/src/lib/skills/access.test.ts
git commit -m "feat: add shared skill access service"
git push
```

### Task 4: Add Best-Effort Resend Invite Adapter

**Files:**
- Create: `app/src/lib/email/resend.ts`
- Create: `app/src/lib/email/resend.test.ts`

- [ ] **Step 1: Write failing email adapter tests**

Create tests for:

```ts
test("sendSkillInviteEmail returns sent status with resend id", async () => {});
test("sendSkillInviteEmail returns failed status when API key is missing", async () => {});
test("sendSkillInviteEmail returns failed status when Resend throws", async () => {});
```

Do not call the real network. Inject a fake `send` function.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd app && npm test -- src/lib/email/resend.test.ts
```

Expected: FAIL because adapter is missing.

- [ ] **Step 3: Implement adapter**

Implement:

```ts
export type SkillInviteEmailParams = {
  toEmail: string;
  fromEmail?: string;
  skillName: string;
  permission: "use" | "edit";
  sharedByEmail?: string | null;
  dashboardUrl: string;
};

export async function sendSkillInviteEmail(params: SkillInviteEmailParams, deps = {}) {
  const apiKey = deps.apiKey ?? process.env.RESEND_API_KEY;
  const from = params.fromEmail ?? "eren@skillfully.sh";
  if (!apiKey) return { status: "failed" as const, error: "RESEND_API_KEY is not set" };
  // Use new Resend(apiKey).emails.send(...)
}
```

Return `{ status: "sent", resendEmailId }` or `{ status: "failed", error }`; never throw for delivery failures.

- [ ] **Step 4: Run email tests**

Run:

```bash
cd app && npm test -- src/lib/email/resend.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/email/resend.ts app/src/lib/email/resend.test.ts
git commit -m "feat: add invite email delivery"
git push
```

## Chunk 2: Releases And Unified Install Surface

### Task 5: Switch Skill Releases To Integer Versions

**Files:**
- Modify: `app/src/lib/skills/repository.ts`
- Modify: `app/src/lib/skills/repository.test.ts`
- Modify: `app/src/lib/stakeholder-flow.test.ts`

- [ ] **Step 1: Write failing integer version tests**

Update `app/src/lib/skills/repository.test.ts`:

```ts
assert.equal(created.version.version, "1");
assert.equal(created.version.versionNumber, 1);
// after markDraftPublished:
assert.equal(publishedVersions[0].version, "1");
assert.equal(draftVersions[0].version, "2");
assert.equal(draftVersions[0].versionNumber, 2);
```

Update any `0.1.0` dashboard/frontmatter assertions as needed in a later UI task.

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
cd app && npm test -- src/lib/skills/repository.test.ts
```

Expected: FAIL because versions still use semver labels.

- [ ] **Step 3: Implement integer versioning**

In `repository.ts`:

- replace `nextDraftVersionLabel` semver parsing with integer increment;
- create initial draft version with `version: "1"` and `versionNumber: 1`;
- when publishing, create next draft with `String(currentVersionNumber + 1)`;
- preserve `version` as string for existing serializers;
- set `versionNumber` when creating versions and manifest data.

Minimal helper:

```ts
function nextReleaseVersionNumber(version: SkillVersionRow) {
  if (typeof version.versionNumber === "number") return version.versionNumber + 1;
  const parsed = Number.parseInt(version.version, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed + 1 : 1;
}
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
cd app && npm test -- src/lib/skills/repository.test.ts src/lib/stakeholder-flow.test.ts
```

Expected: PASS after updating expectations.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/skills/repository.ts app/src/lib/skills/repository.test.ts app/src/lib/stakeholder-flow.test.ts
git commit -m "feat: use integer skill release versions"
git push
```

### Task 6: Update Manifest And Install Prompt URLs

**Files:**
- Modify: `app/src/lib/skills/skill-files.ts`
- Modify: `app/src/lib/skills/skill-files.test.ts`
- Modify: `app/src/lib/skills/install-prompts.ts`
- Modify: `app/src/lib/skills/install-prompts.test.ts`
- Modify: `app/src/lib/agent-author-api.ts`
- Modify: `app/src/lib/stakeholder-flow.test.ts`

- [ ] **Step 1: Write failing URL expectation tests**

Update tests to expect:

```txt
https://www.skillfully.sh/api/skills/sk_demo/manifest
https://www.skillfully.sh/api/skills/sk_demo/files/SKILL.md
POST https://www.skillfully.sh/api/skills/sk_demo/install
```

Legacy `/api/public/skills/...` should appear only in compatibility route tests, not generated prompts.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd app && npm test -- src/lib/skills/skill-files.test.ts src/lib/skills/install-prompts.test.ts src/lib/stakeholder-flow.test.ts
```

Expected: FAIL while helpers still emit `/api/public/skills`.

- [ ] **Step 3: Update helpers**

Change `skillfullyManifestUrl`, `skillfullyFileUrl`, manifest generation, install prompt generation, and agent skill links to use `/api/skills/...`.

- [ ] **Step 4: Run focused tests**

Run:

```bash
cd app && npm test -- src/lib/skills/skill-files.test.ts src/lib/skills/install-prompts.test.ts src/lib/stakeholder-flow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/skills/skill-files.ts app/src/lib/skills/skill-files.test.ts app/src/lib/skills/install-prompts.ts app/src/lib/skills/install-prompts.test.ts app/src/lib/agent-author-api.ts app/src/lib/stakeholder-flow.test.ts
git commit -m "feat: use unified skill install URLs"
git push
```

### Task 7: Add Unified Install Routes

**Files:**
- Create: `app/src/app/api/skills/[skillId]/route.test.ts`
- Create: `app/src/app/api/skills/[skillId]/manifest/route.ts`
- Create: `app/src/app/api/skills/[skillId]/files/[...path]/route.ts`
- Create: `app/src/app/api/skills/[skillId]/install/route.ts`
- Modify: `app/src/app/api/public/skills/[skillId]/manifest/route.ts`
- Modify: `app/src/app/api/public/skills/[skillId]/files/[...path]/route.ts`
- Modify: `app/src/app/api/public/skills/[skillId]/install/route.ts`

- [ ] **Step 1: Write failing route tests**

Create tests that import route handlers and mock/stub the shared dependencies where practical. Cover:

```ts
test("public manifest serves without auth", async () => {});
test("private manifest without auth returns 401", async () => {});
test("private manifest with auth but no access returns 404", async () => {});
test("private manifest with use access serves latest release", async () => {});
test("private file route with edit access serves file", async () => {});
test("public compatibility route refuses private skills", async () => {});
```

- [ ] **Step 2: Run route tests to verify failure**

Run:

```bash
cd app && npm test -- 'src/app/api/skills/**/*.test.ts'
```

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Implement shared install route helpers**

If route files start duplicating manifest/file lookup logic, add a local helper under:

```txt
app/src/app/api/skills/[skillId]/install-helpers.ts
```

Keep helper focused on:

- parsing bearer token when present;
- resolving dashboard/agent token owner if present;
- deciding `401` vs `404`;
- loading published version/files;
- recording usage events.

- [ ] **Step 4: Implement routes**

Routes should:

- serve public published skills without auth;
- require bearer auth for private skills;
- call `requireSkillUseAccess` for private skills;
- return `404` for valid-auth/no-access private skills;
- return no draft files for unreleased private skills;
- refresh storage URLs using existing behavior from public routes.

Compatibility `/api/public/skills/...` routes should remain public-only.

- [ ] **Step 5: Run focused tests**

Run:

```bash
cd app && npm test -- 'src/app/api/skills/**/*.test.ts' src/lib/skills/skill-files.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/app/api/skills app/src/app/api/public/skills
git commit -m "feat: add unified skill install routes"
git push
```

## Chunk 3: Sharing Routes

### Task 8: Add Dashboard Sharing Routes

**Files:**
- Create: `app/src/app/api/dashboard/skills/[skillId]/access/route.ts`
- Create: `app/src/app/api/dashboard/skills/[skillId]/access/[grantId]/route.ts`
- Create: `app/src/app/api/dashboard/skills/[skillId]/access/route.test.ts`
- Modify: `app/src/lib/skills/access.ts`
- Modify: `app/src/lib/email/resend.ts`

- [ ] **Step 1: Write failing dashboard route tests**

Tests should cover:

```ts
test("owner can list grants", async () => {});
test("editor can grant use access and receives sent notification status", async () => {});
test("editor can grant edit access with delivery warning when Resend fails", async () => {});
test("use-only user cannot list grants", async () => {});
test("editor cannot revoke owner", async () => {});
test("editor can revoke non-owner grant", async () => {});
test("dashboard route normalizes email", async () => {});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd app && npm test -- 'src/app/api/dashboard/skills/**/*.test.ts'
```

Expected: FAIL because access routes do not exist.

- [ ] **Step 3: Implement dashboard routes**

Route behavior:

- `GET`: require edit access; return grants excluding hidden internals.
- `POST`: require edit access; parse `{ email, permission }`; call `grantSkillAccess`; call `sendSkillInviteEmail`; create notification row; return `{ grant, notification }`.
- `PATCH`: require edit access; update grant permission for non-owner grant.
- `DELETE`: require edit access; revoke non-owner grant.

Use `getDashboardUser` for auth and route helpers for JSON responses.

- [ ] **Step 4: Run focused tests**

Run:

```bash
cd app && npm test -- 'src/app/api/dashboard/skills/**/*.test.ts' src/lib/skills/access.test.ts src/lib/email/resend.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/app/api/dashboard/skills app/src/lib/skills/access.ts app/src/lib/email/resend.ts
git commit -m "feat: add dashboard skill sharing routes"
git push
```

### Task 9: Add Agent Sharing Routes And Skill Docs

**Files:**
- Create: `app/src/app/api/agent/skills/[skillId]/access/route.ts`
- Create: `app/src/app/api/agent/skills/[skillId]/access/[grantId]/route.ts`
- Create: `app/src/app/api/agent/skills/[skillId]/access/route.test.ts`
- Modify: `app/src/app/api/agent/skills/route.ts`
- Modify: `app/src/lib/agent-author-api.ts`
- Modify: `skills/skillfully/SKILL.md`

- [ ] **Step 1: Write failing agent route tests**

Tests should cover:

```ts
test("agent list includes skills shared with edit access", async () => {});
test("agent can grant use access by skill_id", async () => {});
test("agent can revoke non-owner grant", async () => {});
test("agent with use-only access cannot grant access", async () => {});
test("agent responses include email delivery warning without failing grant", async () => {});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd app && npm test -- 'src/app/api/agent/skills/**/*.test.ts'
```

Expected: FAIL until routes/listing support shared skills.

- [ ] **Step 3: Implement agent routes**

Route behavior:

- use `requireAgentAuthor`;
- accept `skill_id` only via route param;
- use shared access service;
- no skill-name mutation support;
- `GET /api/agent/skills` should list owned and edit-shared skills so agents can resolve names to ids.

Serialization should include an access marker such as:

```json
{
  "access_level": "owner|edit|use",
  "owner_id": "..."
}
```

- [ ] **Step 4: Update `skills/skillfully/SKILL.md`**

Add a sharing section:

```md
## Share a skill

First list skills and resolve the exact `skill_id`:

curl "$BASE_URL/api/agent/skills" \
  -H "authorization: Bearer <access_token>"

Grant access:

curl -X POST "$BASE_URL/api/agent/skills/sk_xxxxxx/access" \
  -H "authorization: Bearer <access_token>" \
  -H "content-type: application/json" \
  -d '{"email":"y@z.com","permission":"edit"}'

Use `permission:"use"` for release-only access. If the response contains
`notification.status:"failed"`, access still succeeded; only email delivery failed.

Revoke a non-owner grant:

curl -X DELETE "$BASE_URL/api/agent/skills/sk_xxxxxx/access/<grant_id>" \
  -H "authorization: Bearer <access_token>"
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
cd app && npm test -- 'src/app/api/agent/skills/**/*.test.ts' src/lib/agent-api.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/app/api/agent/skills app/src/lib/agent-author-api.ts skills/skillfully/SKILL.md
git commit -m "feat: add agent skill sharing API"
git push
```

## Chunk 4: Access-Aware Authoring Routes

### Task 10: Replace Owner-Only Checks In Authoring Routes

**Files:**
- Modify: `app/src/app/api/dashboard/skills/[skillId]/route.ts`
- Modify: `app/src/app/api/dashboard/skills/[skillId]/files/route.ts`
- Modify: `app/src/app/api/dashboard/skills/[skillId]/files/[fileId]/route.ts`
- Modify: `app/src/app/api/dashboard/skills/[skillId]/publish/route.ts`
- Modify: `app/src/app/api/dashboard/skills/[skillId]/targets/[targetKind]/route.ts`
- Modify: `app/src/app/api/agent/skills/[skillId]/route.ts`
- Modify: `app/src/app/api/agent/skills/[skillId]/files/route.ts`
- Modify: `app/src/app/api/agent/skills/[skillId]/files/[fileId]/route.ts`
- Modify: `app/src/app/api/agent/skills/[skillId]/publish/route.ts`
- Modify: `app/src/app/api/agent/skills/[skillId]/analytics/route.ts`
- Modify: `app/src/lib/skills/repository.ts`
- Modify: relevant route tests.

- [ ] **Step 1: Write failing access-aware route tests**

Add/extend tests proving:

```ts
test("edit collaborator can load and update draft files", async () => {});
test("edit collaborator can publish", async () => {});
test("use collaborator cannot load draft files", async () => {});
test("use collaborator cannot publish", async () => {});
test("edit collaborator can view analytics", async () => {});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd app && npm test -- 'src/app/api/dashboard/skills/**/*.test.ts' 'src/app/api/agent/skills/**/*.test.ts'
```

Expected: FAIL because routes still query by caller `ownerId`.

- [ ] **Step 3: Implement owner-context repository access**

Keep stored rows owner-scoped, but when access resolves as `edit`, call repository helpers with the actual skill owner id, not the collaborator user id.

Add a helper shape:

```ts
const access = await requireSkillEditAccess({ userId, email, skillId });
const ownerId = access.skill.ownerId;
```

Then pass `ownerId` into existing repository helpers.

- [ ] **Step 4: Update routes**

Dashboard and agent route wrappers should:

- authenticate caller;
- resolve access;
- use actual `skill.ownerId` for storage/repository queries;
- preserve existing error shapes where possible;
- return `404` for no access on private skill resources.

- [ ] **Step 5: Run focused tests**

Run:

```bash
cd app && npm test -- 'src/app/api/dashboard/skills/**/*.test.ts' 'src/app/api/agent/skills/**/*.test.ts' src/lib/skills/access.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/app/api/dashboard/skills app/src/app/api/agent/skills app/src/lib/skills/repository.ts app/src/lib/skills/access.ts
git commit -m "feat: allow editors to author shared skills"
git push
```

## Chunk 5: Dashboard UI

### Task 11: List Owned And Shared Skills In Dashboard

**Files:**
- Modify: `app/src/app/dashboard/page.tsx`
- Modify: `app/src/app/dashboard/page.test.tsx`
- Modify: `app/src/app/dashboard/view-state.ts`
- Modify: `app/src/app/dashboard/view-state.test.ts`
- Create route/helper as needed: `app/src/app/api/dashboard/skills/shared/route.ts` or extend `app/src/app/api/dashboard/skills/route.ts`

- [ ] **Step 1: Write failing UI tests**

In `page.test.tsx`, add static render tests for:

```ts
test("dashboard selector marks shared skills", async () => {});
test("use-only shared skill hides editor analytics and settings tabs", async () => {});
test("edit shared skill keeps authoring tabs visible", async () => {});
```

Represent access in test skill objects with:

```ts
accessLevel: "owner" | "edit" | "use",
ownerEmail: "owner@example.com",
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd app && npm test -- src/app/dashboard/page.test.tsx src/app/dashboard/view-state.test.ts
```

Expected: FAIL because dashboard only queries owner skills and tabs are not access-aware.

- [ ] **Step 3: Implement dashboard data loading**

Do not duplicate access rules in the client. Either:

- extend `/api/dashboard/skills` with a `GET` returning owned + shared summaries and use it from the dashboard; or
- add `/api/dashboard/skills/shared` for shared summaries and merge with existing Instant-owned query.

Prefer the route-backed summary if the client cannot safely query grants. Summary fields:

```ts
type DashboardSkillSummary = Skill & {
  accessLevel: "owner" | "edit" | "use";
  ownerEmail?: string | null;
};
```

- [ ] **Step 4: Gate tabs and view state**

Ensure use-only skills:

- can be selected;
- route to overview/install surface;
- cannot open editor/analytics/settings;
- do not render share list.

Editors and owners keep existing tabs.

- [ ] **Step 5: Run focused tests**

Run:

```bash
cd app && npm test -- src/app/dashboard/page.test.tsx src/app/dashboard/view-state.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/app/dashboard/page.tsx app/src/app/dashboard/page.test.tsx app/src/app/dashboard/view-state.ts app/src/app/dashboard/view-state.test.ts app/src/app/api/dashboard/skills
git commit -m "feat: show shared skills in dashboard"
git push
```

### Task 12: Add Editor-Panel Share Dialog

**Files:**
- Modify: `app/src/app/dashboard/page.tsx`
- Modify: `app/src/app/dashboard/page.test.tsx`

- [ ] **Step 1: Write failing render tests**

Add tests for:

```ts
test("editor panel renders share button for owners and editors", async () => {});
test("share dialog renders permission selector and current grants", async () => {});
test("use-only shared skill does not render share button", async () => {});
test("owner grant is shown as non-removable", async () => {});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd app && npm test -- src/app/dashboard/page.test.tsx
```

Expected: FAIL until Share UI exists.

- [ ] **Step 3: Implement Share UI**

In `SkillEditorWorkspace`, add:

- `isShareDialogOpen`;
- `accessGrants`;
- `shareEmail`;
- `sharePermission`;
- loading/error/warning state;
- `GET /api/dashboard/skills/${skill.skillId}/access` when dialog opens;
- `POST` to grant;
- `PATCH` or `DELETE` to change/revoke.

Keep the primary button in the editor footer/header area:

```tsx
<button type="button" className={DASHBOARD_BUTTON_LIGHT} onClick={() => setIsShareDialogOpen(true)}>
  Share
</button>
```

Dialog should use existing monochrome dashboard styling, not a marketing-style card.

- [ ] **Step 4: Run focused tests**

Run:

```bash
cd app && npm test -- src/app/dashboard/page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/app/dashboard/page.tsx app/src/app/dashboard/page.test.tsx
git commit -m "feat: add skill share dialog"
git push
```

## Chunk 6: Final Docs, Instant Push, And Verification

### Task 13: Finalize Skill Docs And Product Copy

**Files:**
- Modify: `skills/skillfully/SKILL.md`
- Modify: `docs/skillfullysh/memories/2026-05-19-memory.md`
- Modify: `docs/skillfullysh/memories/TOC.md`

- [ ] **Step 1: Re-read current docs before editing**

Run:

```bash
sed -n '1,220p' skills/skillfully/SKILL.md
sed -n '1,220p' docs/skillfullysh/memories/TOC.md
test -f docs/skillfullysh/memories/2026-05-19-memory.md && sed -n '1,220p' docs/skillfullysh/memories/2026-05-19-memory.md || true
```

- [ ] **Step 2: Update memory docs**

Create/update `docs/skillfullysh/memories/2026-05-19-memory.md` with a concise summary:

```md
# 2026-05-19 Memory

- Designed and implemented private skill sharing and collaboration: email-based use/edit grants, Resend invite notifications, unified `/api/skills` install routes, shared dashboard markers, agent sharing APIs, and integer release versions.
- Pushed Instant schema and permission updates for sharing entities.
```

Update `TOC.md` with the 2026-05-19 memory entry and updated headline.

- [ ] **Step 3: Validate skill docs**

Ensure `skills/skillfully/SKILL.md` frontmatter still has required `name` and `description`, and examples match live route names.

- [ ] **Step 4: Commit**

```bash
git add skills/skillfully/SKILL.md docs/skillfullysh/memories/2026-05-19-memory.md docs/skillfullysh/memories/TOC.md
git commit -m "docs: document private skill sharing"
git push
```

### Task 14: Run Full Verification And Push Instant Schema

**Files:**
- No planned source edits unless verification reveals issues.

- [ ] **Step 1: Run lint**

```bash
cd app && npm run lint
```

Expected: PASS.

- [ ] **Step 2: Run full tests**

```bash
cd app && npm test
```

Expected: all tests pass.

- [ ] **Step 3: Run production build**

```bash
cd app && npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Check whitespace**

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 5: Push Instant schema**

```bash
cd app && npx instant-cli push schema --yes
```

Expected: schema push succeeds. If CLI auth/env is missing, capture the exact error and stop to report it.

- [ ] **Step 6: Push Instant permissions**

```bash
cd app && npx instant-cli push perms --yes
```

Expected: permission push succeeds. If CLI auth/env is missing, capture the exact error and stop to report it.

- [ ] **Step 7: Final commit for verification fixes if needed**

Only if verification required code/doc fixes:

```bash
git add <fixed-files>
git commit -m "fix: complete private sharing verification"
git push
```

- [ ] **Step 8: Final status**

Report:

- commits pushed,
- tests/build status,
- Instant schema/perms push status,
- any known limitations or follow-ups.
