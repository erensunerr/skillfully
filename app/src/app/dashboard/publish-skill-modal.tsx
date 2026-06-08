"use client";

import type { PublishModalStep } from "./dashboard-model";
import { DASHBOARD_BUTTON, DASHBOARD_BUTTON_LIGHT } from "./dashboard-model";

export function PublishSkillModal({
  step,
  skillName,
  visibility,
  installPrompt,
  installPromptCopied,
  isPublishing,
  publishError,
  pullRequestUrl,
  onCancel,
  onConfirm,
  onCopyInstallPrompt,
  onContinueAfterMerge,
  onContinueToInstallCheck,
  onFinish,
}: {
  step: PublishModalStep;
  skillName: string;
  visibility: "private" | "public";
  installPrompt: string;
  installPromptCopied: boolean;
  isPublishing: boolean;
  publishError: string;
  pullRequestUrl?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  onCopyInstallPrompt: () => void;
  onContinueAfterMerge: () => void;
  onContinueToInstallCheck: () => void;
  onFinish: () => void;
}) {
  const isPrivateRelease = visibility === "private";
  const requiresMerge = Boolean(pullRequestUrl) || step === "merge";
  const stepTotal = requiresMerge ? 4 : 3;
  const stepIndex =
    step === "confirm"
      ? 1
      : step === "merge"
        ? 2
        : step === "published"
          ? requiresMerge ? 3 : 2
          : stepTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/35 px-5 py-8 backdrop-blur-[1px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-skill-title"
        aria-busy={step === "confirm" && isPublishing ? true : undefined}
        className="w-full max-w-2xl border-2 border-[var(--ink)] bg-[var(--white)] p-6 shadow-[8px_8px_0_var(--ink)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase">Publish step {stepIndex} of {stepTotal}</p>
            <h2 id="publish-skill-title" className="mt-3 font-editorial-sans text-3xl font-bold">
              {step === "confirm"
                ? "Are you sure?"
                : step === "merge"
                  ? "Merge the GitHub pull request"
                  : step === "published"
                    ? "Your skill has been published."
                    : step === "waiting"
                      ? "Waiting for installation confirmation"
                      : "It works now!"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close publish modal"
            className="border border-[var(--ink)] px-3 py-1 font-editorial-mono text-lg disabled:cursor-not-allowed disabled:opacity-45"
            disabled={isPublishing}
            onClick={onCancel}
          >
            ×
          </button>
        </div>

        {step === "confirm" ? (
          <>
            <p className="mt-6 text-lg leading-8">
              {isPrivateRelease ? (
                <>
                  This publishes a frozen private release of <strong>{skillName}</strong>. Only people with use or edit access can install it.
                </>
              ) : (
                <>
                  This will make <strong>{skillName}</strong> publicly accessible.
                </>
              )}
            </p>
            {isPublishing ? (
              <p className="mt-4 border border-[var(--ink)] bg-[var(--paper)] p-3 font-editorial-mono text-xs font-bold uppercase">
                Publishing can take a few seconds while Skillfully syncs the release targets.
              </p>
            ) : null}
            {publishError ? (
              <p className="mt-4 border border-red-600 bg-red-50 p-3 font-editorial-mono text-xs font-bold uppercase text-red-700">
                {publishError}
              </p>
            ) : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" className={DASHBOARD_BUTTON_LIGHT} disabled={isPublishing} onClick={onCancel}>
                No, keep draft
              </button>
              <button
                type="button"
                className={`${DASHBOARD_BUTTON} inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={isPublishing}
                onClick={onConfirm}
              >
                {isPublishing ? (
                  <span
                    aria-hidden
                    className="h-3 w-3 rounded-full border border-current border-t-transparent animate-spin"
                  />
                ) : null}
                {isPublishing ? "Publishing..." : "Yes, publish"}
              </button>
            </div>
          </>
        ) : null}

        {step === "merge" ? (
          <>
            <p className="mt-6 text-base leading-7">
              <strong>{skillName}</strong> is managed in GitHub. Merge the pull request before installing so agents read the latest files from the source repository.
            </p>
            {pullRequestUrl ? (
              <a
                href={pullRequestUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 block break-all border border-[var(--ink)] bg-[var(--paper)] p-4 font-editorial-mono text-xs font-bold underline"
              >
                {pullRequestUrl}
              </a>
            ) : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              {pullRequestUrl ? (
                <a
                  href={pullRequestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`${DASHBOARD_BUTTON_LIGHT} text-center`}
                >
                  Open pull request
                </a>
              ) : null}
              <button type="button" className={DASHBOARD_BUTTON} onClick={onContinueAfterMerge}>
                I merged the PR
              </button>
            </div>
          </>
        ) : null}

        {step === "published" ? (
          <>
            <p className="mt-6 text-base leading-7">
              {isPrivateRelease
                ? "Paste this into Codex or Claude Code to install your private skill. Shared users can do the same with their own account."
                : "Paste this into Codex or Claude Code to install your skill. You can also share it with friends."}
            </p>
            <pre className="mt-5 max-h-56 overflow-auto border border-[var(--ink)] bg-[var(--paper)] p-4 font-editorial-mono text-xs leading-5">
              {installPrompt}
            </pre>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" className={DASHBOARD_BUTTON_LIGHT} onClick={onCopyInstallPrompt}>
                {installPromptCopied ? "Copied" : "Copy installation prompt"}
              </button>
              <button type="button" className={DASHBOARD_BUTTON} onClick={onContinueToInstallCheck}>
                Check installation
              </button>
            </div>
          </>
        ) : null}

        {step === "waiting" || step === "confirmed" ? (
          <>
            <div className="mt-8 border border-[var(--ink)] bg-[var(--paper)] p-5">
              <div className="flex items-center gap-4">
                <span
                  aria-hidden
                  className={`h-3 w-3 rounded-full ${
                    step === "confirmed" ? "bg-emerald-700" : "animate-pulse bg-[var(--ink)]"
                  }`}
                />
                <p className="font-editorial-sans text-lg">
                  {step === "confirmed"
                    ? "It works now!"
                    : "Waiting for the agent to call the install or feedback endpoint..."}
                </p>
              </div>
              {step === "waiting" ? (
                <p className="mt-4 text-sm leading-6 text-[var(--ink)]/70">
                  Skillfully completes this step only after the public install endpoint records `skill_installed` or the feedback endpoint records `feedback_received`.
                </p>
              ) : null}
            </div>
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                className={step === "confirmed" ? DASHBOARD_BUTTON : DASHBOARD_BUTTON_LIGHT}
                disabled={step === "waiting"}
                onClick={onFinish}
              >
                Finish
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
