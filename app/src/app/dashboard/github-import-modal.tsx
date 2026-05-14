"use client";

type GitHubImportCandidateStatus = "valid" | "invalid" | "already_imported";

export type GitHubImportCandidateView = {
  id: string;
  repoFullName: string;
  skillName: string;
  skillRoot: string;
  status: GitHubImportCandidateStatus;
  reason?: string;
  oversizedFiles?: Array<{ relativePath: string; size: number }>;
  totalSizeExceedsLimit?: boolean;
};

export type GitHubImportModalState = "loading" | "ready" | "empty" | "error";

const BUTTON =
  "border-4 border-black bg-black px-4 py-2 text-sm font-black uppercase text-white transition-all hover:bg-yellow-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-black disabled:hover:text-white";
const BUTTON_LIGHT =
  "border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase text-black transition-all hover:bg-black hover:text-white";

function statusLabel(candidate: GitHubImportCandidateView) {
  if (candidate.status === "invalid") {
    return "Invalid";
  }
  if (candidate.status === "already_imported") {
    return "Already imported";
  }
  if ((candidate.oversizedFiles?.length ?? 0) > 0 || candidate.totalSizeExceedsLimit) {
    return "Importable with skipped files";
  }
  return "Ready";
}

function statusClass(candidate: GitHubImportCandidateView) {
  if (candidate.status === "invalid") {
    return "text-red-700";
  }
  if (candidate.status === "already_imported") {
    return "text-zinc-500";
  }
  if ((candidate.oversizedFiles?.length ?? 0) > 0 || candidate.totalSizeExceedsLimit) {
    return "text-amber-700";
  }
  return "text-emerald-700";
}

export function GitHubImportModal({
  state,
  candidates,
  selectedCandidateIds,
  warnings,
  isImporting,
  importError,
  onToggleCandidate,
  onImport,
  onClose,
  onChangeRepositoryAccess,
}: {
  state: GitHubImportModalState;
  candidates: GitHubImportCandidateView[];
  selectedCandidateIds: Set<string>;
  warnings: string[];
  isImporting: boolean;
  importError: string;
  onToggleCandidate: (candidateId: string) => void;
  onImport: () => void;
  onClose: () => void;
  onChangeRepositoryAccess: () => void;
}) {
  const selectableCount = candidates.filter((candidate) => candidate.status === "valid").length;
  const selectedCount = candidates.filter((candidate) => selectedCandidateIds.has(candidate.id)).length;
  const isReady = state === "ready" && selectableCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 px-3 py-6 backdrop-blur-[1px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-import-title"
        className="relative my-auto flex max-h-[88vh] w-full max-w-[860px] flex-col border-4 border-black bg-[#fffdf8] text-black shadow-[10px_10px_0_rgba(0,0,0,0.28)]"
      >
        <button
          type="button"
          aria-label="Close GitHub import"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center border-2 border-black bg-white font-mono text-lg font-black leading-none transition-all hover:bg-black hover:text-white"
          onClick={onClose}
        >
          ×
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-7 sm:px-8 sm:pb-7">
          <p className="font-mono text-sm font-black uppercase">GitHub import</p>
          <h2
            id="github-import-title"
            className="mt-5 max-w-[14ch] text-4xl font-black uppercase leading-[0.95] sm:text-5xl lg:text-6xl"
          >
            Import skills
          </h2>

          {state === "loading" ? (
            <div className="mt-7 border-2 border-black bg-white p-5">
              <p className="font-mono text-sm font-black uppercase">
                Finding skills in your GitHub repositories...
              </p>
            </div>
          ) : null}

          {state === "error" ? (
            <div className="mt-7 border-2 border-red-700 bg-red-50 p-5 text-red-700">
              <p className="font-mono text-sm font-black uppercase">{importError || "GitHub import failed."}</p>
            </div>
          ) : null}

          {state === "empty" ? (
            <div className="mt-7 border-2 border-black bg-white p-5">
              <h3 className="text-2xl font-bold">No skills found</h3>
              <p className="mt-2 font-mono text-sm leading-6">
                No valid Agent Skills were found in the repositories you connected.
              </p>
            </div>
          ) : null}

          {isReady || (state === "ready" && candidates.length > 0) ? (
            <div className="mt-7 space-y-3">
              {candidates.map((candidate) => {
                const disabled = candidate.status !== "valid" || isImporting;
                return (
                  <label
                    key={candidate.id}
                    className={`grid gap-4 border-2 border-black bg-white p-4 sm:grid-cols-[auto_1fr] ${
                      disabled ? "opacity-75" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 accent-black"
                      checked={selectedCandidateIds.has(candidate.id)}
                      disabled={disabled}
                      onChange={() => onToggleCandidate(candidate.id)}
                    />
                    <span className="min-w-0">
                      <span className="block break-words font-mono text-sm font-black">
                        {candidate.repoFullName} - {candidate.skillName}
                      </span>
                      <span className="mt-1 block break-words font-mono text-xs">
                        {candidate.skillRoot}
                      </span>
                      <span className={`mt-2 block font-mono text-xs font-black uppercase ${statusClass(candidate)}`}>
                        {statusLabel(candidate)}
                      </span>
                      {candidate.reason ? (
                        <span className="mt-1 block font-mono text-xs text-red-700">{candidate.reason}</span>
                      ) : null}
                      {(candidate.oversizedFiles?.length ?? 0) > 0 ? (
                        <span className="mt-1 block font-mono text-xs text-amber-700">
                          {candidate.oversizedFiles?.length} oversized file(s) will be skipped.
                        </span>
                      ) : null}
                      {candidate.totalSizeExceedsLimit ? (
                        <span className="mt-1 block font-mono text-xs text-amber-700">
                          Files after the 1 GiB directory limit will be skipped.
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="mt-5 border-2 border-amber-700 bg-amber-50 p-4 text-amber-900">
              {warnings.map((warning) => (
                <p key={warning} className="font-mono text-xs">
                  {warning}
                </p>
              ))}
            </div>
          ) : null}

          {importError && state !== "error" ? (
            <p className="mt-5 border-2 border-red-700 bg-red-50 p-3 font-mono text-xs font-black uppercase text-red-700">
              {importError}
            </p>
          ) : null}
        </div>

        <footer className="flex flex-col gap-3 border-t-4 border-black px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <button type="button" className={BUTTON_LIGHT} onClick={onChangeRepositoryAccess}>
            Change repository access
          </button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" className={BUTTON_LIGHT} onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className={BUTTON}
              disabled={!isReady || selectedCount === 0 || isImporting}
              onClick={onImport}
            >
              {isImporting ? "Importing..." : "Import selected"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
