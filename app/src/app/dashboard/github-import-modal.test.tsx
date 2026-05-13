import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { GitHubImportModal } from "./github-import-modal";

const baseProps = {
  selectedCandidateIds: new Set<string>(),
  isImporting: false,
  importError: "",
  onToggleCandidate: () => undefined,
  onImport: () => undefined,
  onClose: () => undefined,
  onChangeRepositoryAccess: () => undefined,
};

test("GitHub import modal renders the loading state without scan copy", () => {
  const html = renderToStaticMarkup(
    <GitHubImportModal
      {...baseProps}
      state="loading"
      candidates={[]}
      warnings={[]}
    />,
  );

  assert.match(html, /Finding skills in your GitHub repositories/);
  assert.doesNotMatch(html, /scan/i);
});

test("GitHub import modal renders unchecked valid candidates and disabled invalid rows", () => {
  const html = renderToStaticMarkup(
    <GitHubImportModal
      {...baseProps}
      state="ready"
      candidates={[
        {
          id: "valid-1",
          repoFullName: "octocat/Hello-World",
          skillName: "code-review",
          skillRoot: ".agents/skills/code-review",
          status: "valid",
        },
        {
          id: "invalid-1",
          repoFullName: "octocat/Hello-World",
          skillName: "bad-skill",
          skillRoot: "skills/bad-skill",
          status: "invalid",
          reason: "name is required",
        },
        {
          id: "existing-1",
          repoFullName: "octocat/Hello-World",
          skillName: "test-writer",
          skillRoot: "skills/test-writer",
          status: "already_imported",
        },
      ]}
      warnings={["octocat/Hello-World: repository tree is too large to check completely"]}
    />,
  );

  assert.match(html, /octocat\/Hello-World - code-review/);
  assert.match(html, /Invalid/);
  assert.match(html, /name is required/);
  assert.match(html, /Already imported/);
  assert.match(html, /repository tree is too large/);
  assert.match(html, /Import selected/);
});

test("GitHub import modal renders no-skills state with repository access action", () => {
  const html = renderToStaticMarkup(
    <GitHubImportModal
      {...baseProps}
      state="empty"
      candidates={[]}
      warnings={[]}
    />,
  );

  assert.match(html, /No skills found/);
  assert.match(html, /Change repository access/);
});
