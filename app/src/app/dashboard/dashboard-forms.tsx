"use client";

import { type FormEvent } from "react";
import type { AuthForm as AuthFormState, AuthPhase, SkillForm as SkillFormState } from "./dashboard-model";
import { DASHBOARD_BUTTON, DASHBOARD_BUTTON_LIGHT, DASHBOARD_INPUT, DASHBOARD_PANEL } from "./dashboard-model";

export function AuthForm({
  phase,
  form,
  email,
  onEmailSubmit,
  onVerifySubmit,
  onEmailChange,
  onCodeChange,
  onCodePaste,
  onChangeMode,
  disabled,
  message,
}: {
  phase: AuthPhase;
  form: AuthFormState;
  email: string;
  onEmailSubmit: () => void;
  onVerifySubmit: () => void;
  onEmailChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onCodePaste: () => void;
  onChangeMode: () => void;
  disabled: boolean;
  message: string;
}) {
  const isRequest = phase === "request";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] p-6 text-[var(--ink)]">
      <div className="w-full max-w-md space-y-3">
        <div className={`${DASHBOARD_PANEL} p-6`}>
          <p className="font-editorial-mono text-xs font-bold uppercase">Skillfully account</p>
          <h2 className="mt-4 font-editorial-sans text-3xl font-bold">Continue to dashboard</h2>

          <p className="mt-3 text-sm leading-6">
            {isRequest
              ? "Enter your email. We will send a one-time code."
              : `We sent a code to ${email}.`}
          </p>

          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (isRequest) {
                onEmailSubmit();
              } else {
                onVerifySubmit();
              }
            }}
          >
            {isRequest ? (
              <label className="block font-editorial-mono text-xs font-bold uppercase">
                Email
                <input
                  type="email"
                  className={DASHBOARD_INPUT}
                  value={form.email}
                  onChange={(event) => onEmailChange(event.currentTarget.value)}
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  minLength={3}
                />
              </label>
            ) : (
              <label className="block font-editorial-mono text-xs font-bold uppercase">
                Verification code
                <input
                  type="text"
                  className={`${DASHBOARD_INPUT} text-center tracking-[0.3em]`}
                  value={form.code}
                  onChange={(event) => onCodeChange(event.currentTarget.value)}
                  onPaste={onCodePaste}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                />
              </label>
            )}

            <button
              type="submit"
              disabled={disabled}
              className={`${DASHBOARD_BUTTON} w-full disabled:opacity-50`}
            >
              {isRequest ? "Send code" : "Verify code"}
            </button>
          </form>

          {isRequest ? null : (
            <button
              type="button"
              className="mt-4 font-editorial-mono text-xs font-bold uppercase underline"
              onClick={onChangeMode}
            >
              Use a different email
            </button>
          )}

          {message ? (
            <p className="mt-4 border border-red-600 bg-red-50 p-3 font-editorial-mono text-xs font-bold uppercase text-red-700">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export function SkillForm({
  form,
  onSubmit,
  onCancel,
  onInputChange,
}: {
  form: SkillFormState;
  onSubmit: (name: string, description: string) => void;
  onCancel: () => void;
  onInputChange: (value: SkillFormState) => void;
}) {
  return (
    <section className={`${DASHBOARD_PANEL} mx-auto w-full max-w-3xl p-6 sm:p-8`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">Editor</p>
      <h2 className="mt-4 font-editorial-sans text-4xl font-bold">Create a skill</h2>
      <form
        className="mt-6 space-y-5"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onSubmit(form.name.trim(), form.description.trim());
        }}
      >
        <label className="block font-editorial-mono text-xs font-bold uppercase">
          Name
          <input
            value={form.name}
            className={DASHBOARD_INPUT}
            onChange={(event) => onInputChange({ ...form, name: event.currentTarget.value })}
            required
            name="name"
            placeholder='"code-review" or "write-tests"'
          />
        </label>
        <label className="block font-editorial-mono text-xs font-bold uppercase">
          Description (optional)
          <textarea
            value={form.description}
            className={`${DASHBOARD_INPUT} min-h-28`}
            onChange={(event) => onInputChange({ ...form, description: event.currentTarget.value })}
            name="description"
            placeholder="What does this skill do?"
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" className={DASHBOARD_BUTTON}>
            Create skill
          </button>
          <button type="button" className={DASHBOARD_BUTTON_LIGHT} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

export function CreateSkillModal({
  form,
  onChange,
  onCancel,
  onSubmit,
  onImportFromGitHub,
}: {
  form: SkillFormState;
  onChange: (value: SkillFormState) => void;
  onCancel: () => void;
  onSubmit: (name: string, description: string) => void;
  onImportFromGitHub: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/35 px-5 py-8 backdrop-blur-[1px]">
      <section className="w-full max-w-xl border-2 border-[var(--ink)] bg-[var(--white)] p-7 shadow-[8px_8px_0_var(--ink)] sm:p-9">
        <h2 className="font-editorial-sans text-3xl font-bold">Create new skill</h2>
        <p className="mt-3 font-editorial-mono text-sm">Start a new skill in Skillfully.</p>

        <form
          className="mt-7 space-y-6"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            onSubmit(form.name.trim(), form.description.trim());
          }}
        >
          <label className="block font-editorial-mono text-xs font-bold uppercase">
            Skill name
            <input
              value={form.name}
              className={`${DASHBOARD_INPUT} bg-[var(--paper)]`}
              onChange={(event) => onChange({ ...form, name: event.currentTarget.value })}
              name="name"
              placeholder="e.g. code-review"
              required
            />
          </label>

          <label className="block font-editorial-mono text-xs font-bold uppercase">
            Description (optional)
            <textarea
              value={form.description}
              className={`${DASHBOARD_INPUT} min-h-32 bg-[var(--paper)]`}
              onChange={(event) => onChange({ ...form, description: event.currentTarget.value })}
              name="description"
              placeholder="What does this skill do?"
            />
          </label>

          <p className="font-editorial-mono text-sm">
            Need an existing repo instead?{" "}
            <button
              type="button"
              className="font-bold underline"
              onClick={onImportFromGitHub}
            >
              Import from GitHub
            </button>
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className={DASHBOARD_BUTTON_LIGHT} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={DASHBOARD_BUTTON}>
              Create skill
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}


export function EmptyState({
  onCreate,
  onOpenOnboarding,
}: {
  onCreate: () => void;
  onOpenOnboarding: () => void;
}) {
  return (
    <section className={`${DASHBOARD_PANEL} mx-auto w-full max-w-3xl p-6 sm:p-8`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">Overview</p>
      <h2 className="mt-5 font-editorial-sans text-4xl font-bold">No skills yet.</h2>
      <p className="mt-4 max-w-xl text-base leading-7">
        Add your first skill to start collecting feedback and previewing the dashboard.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" className={DASHBOARD_BUTTON} onClick={onOpenOnboarding}>
          Choose setup path
        </button>
        <button type="button" className={DASHBOARD_BUTTON_LIGHT} onClick={onCreate}>
          Create skill directly
        </button>
      </div>
    </section>
  );
}
