"use client";

import Link from "next/link";

type ActivationMode = "template" | "generate";

type ActivationForm = {
  name: string;
  audience: string;
  job: string;
  examplePrompt: string;
};

const PANEL = "border border-[var(--ink)] bg-[var(--paper)]";
const PRIMARY_BUTTON =
  "inline-flex items-center justify-center border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 font-editorial-sans text-sm font-semibold text-[var(--paper)] transition hover:bg-[var(--paper)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center border border-[var(--ink)] bg-[var(--paper)] px-5 py-3 font-editorial-sans text-sm transition hover:bg-[var(--white)] disabled:cursor-not-allowed disabled:opacity-50";
const INPUT =
  "mt-2 w-full border border-[var(--ink)] bg-[var(--white)] px-3 py-3 text-sm outline-none transition focus:border-[var(--ink)] focus:ring-2 focus:ring-[var(--ink)]/10";

function StartCard({
  eyebrow,
  title,
  body,
  cta,
  onClick,
}: {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <article className={`${PANEL} flex h-full flex-col p-6`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">{eyebrow}</p>
      <h3 className="mt-3 font-editorial-sans text-2xl font-semibold">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-[var(--ink)]/75">{body}</p>
      <button type="button" className={`${PRIMARY_BUTTON} mt-6 w-full`} onClick={onClick}>
        {cta}
      </button>
    </article>
  );
}

export function ActivationWorkspace({
  mode,
  form,
  isSubmitting,
  onModeSelect,
  onFormChange,
  onStartImport,
  onCreate,
}: {
  mode: ActivationMode | null;
  form: ActivationForm;
  isSubmitting: boolean;
  onModeSelect: (mode: ActivationMode) => void;
  onFormChange: (form: ActivationForm) => void;
  onStartImport: () => void;
  onCreate: (mode: ActivationMode) => void;
}) {
  const activeMode = mode ?? "template";

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-11 lg:py-12">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div>
          <p className="font-editorial-mono text-xs font-bold uppercase">Getting started</p>
          <h1 className="mt-4 max-w-3xl font-editorial-sans text-4xl font-bold leading-tight sm:text-5xl">
            Create your first skill draft before you touch the full dashboard.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--ink)]/75">
            Pick a starting point, answer four quick prompts, and Skillfully will open a real draft in the editor.
          </p>
        </div>
        <aside className={`${PANEL} p-5`}>
          <p className="font-editorial-mono text-xs font-bold uppercase">Fast path</p>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-[var(--ink)]/75">
            <li>1. Choose a template, generate from an idea, or import from GitHub.</li>
            <li>2. Give the skill a job, audience, and one example task.</li>
            <li>3. Open the editor with a starter SKILL.md and publish when ready.</li>
          </ol>
          <Link href="/guide" className="mt-5 inline-flex font-editorial-mono text-xs font-bold uppercase underline">
            Read the guide
          </Link>
        </aside>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StartCard
          eyebrow="Template"
          title="Start from a proven scaffold"
          body="Best for first-time authors who want a guided structure and a starter outline inside SKILL.md."
          cta="Use template"
          onClick={() => onModeSelect("template")}
        />
        <StartCard
          eyebrow="Generate"
          title="Turn an idea into a draft"
          body="Describe the job your skill should do and we will shape the first draft around that use case."
          cta="Generate draft"
          onClick={() => onModeSelect("generate")}
        />
        <StartCard
          eyebrow="Import"
          title="Bring in an existing skill"
          body="Already have a skill in GitHub? Connect the repo and start tracking feedback without rewriting anything."
          cta="Import from GitHub"
          onClick={onStartImport}
        />
      </div>

      <section className={`${PANEL} grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_18rem]`}>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-editorial-mono text-xs font-bold uppercase">First skill wizard</p>
            <span className="border border-[var(--ink)]/20 bg-[var(--white)] px-2 py-1 font-editorial-mono text-[0.7rem] uppercase">
              {activeMode === "template" ? "Template path" : "Generate path"}
            </span>
          </div>
          <h2 className="mt-3 font-editorial-sans text-3xl font-semibold">
            {activeMode === "template" ? "Fill in the starter template" : "Describe the skill you want to generate"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink)]/75">
            We will use these answers to create the first draft and focus the editor on SKILL.md.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block text-sm">
              <span className="font-editorial-sans">Skill name</span>
              <input
                className={INPUT}
                placeholder="e.g. code-review"
                value={form.name}
                onChange={(event) => onFormChange({ ...form, name: event.currentTarget.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="font-editorial-sans">Who is this for?</span>
              <input
                className={INPUT}
                placeholder="e.g. SaaS founders, docs teams, engineers"
                value={form.audience}
                onChange={(event) => onFormChange({ ...form, audience: event.currentTarget.value })}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-editorial-sans">What job should it do?</span>
              <textarea
                className={`${INPUT} min-h-28`}
                placeholder="e.g. Review product launch copy for unsupported claims and rewrite weak sections"
                value={form.job}
                onChange={(event) => onFormChange({ ...form, job: event.currentTarget.value })}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-editorial-sans">Example task or prompt</span>
              <textarea
                className={`${INPUT} min-h-28`}
                placeholder="e.g. Review this draft launch email and tighten the CTA without sounding robotic"
                value={form.examplePrompt}
                onChange={(event) => onFormChange({ ...form, examplePrompt: event.currentTarget.value })}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className={PRIMARY_BUTTON}
              disabled={isSubmitting}
              onClick={() => onCreate(activeMode)}
            >
              {isSubmitting ? "Creating draft..." : "Create draft and open editor"}
            </button>
            <button type="button" className={SECONDARY_BUTTON} onClick={() => onModeSelect(activeMode === "template" ? "generate" : "template")}>
              Switch to {activeMode === "template" ? "generate" : "template"} path
            </button>
          </div>
        </div>

        <aside className="border border-dashed border-[var(--ink)]/30 bg-[var(--white)] p-5">
          <p className="font-editorial-mono text-xs font-bold uppercase">What gets generated</p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--ink)]/75">
            <li>A starter SKILL.md with your audience, job, and usage guidance.</li>
            <li>A concrete example prompt you can edit instead of a blank page.</li>
            <li>A focused first editor view so you can publish faster.</li>
          </ul>
        </aside>
      </section>
    </section>
  );
}
