"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { captureClientEvent } from "@/lib/client-analytics";

import { LandingAuthLink, LandingPageView } from "../landing-analytics";

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 font-editorial-sans text-sm font-semibold !text-white transition hover:bg-[var(--paper)] hover:!text-[var(--ink)]";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center border border-[var(--ink)] bg-[var(--paper)] px-5 py-3 font-editorial-sans text-sm font-semibold !text-[var(--ink)] transition hover:bg-[var(--white)]";
const PANEL = "border border-[var(--ink)] bg-[var(--paper)]";

const AGENT_PROMPT = `Help me create my first agent skill. Ask me 5 short questions about who the skill is for, what job it should do, one example task, what good output looks like, and common failure modes. Then draft a short SKILL.md outline I can paste into Skillfully.`;

type AgentSkillAnswer = "yes" | "no" | null;
type AgentAccessAnswer = "yes" | "no" | null;

function ChoiceButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${isActive ? PRIMARY_BUTTON : SECONDARY_BUTTON} w-full sm:w-auto`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function AgentFirstLanding() {
  const [knowsAgentSkill, setKnowsAgentSkill] = useState<AgentSkillAnswer>(null);
  const [hasAgentAccess, setHasAgentAccess] = useState<AgentAccessAnswer>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const quizState = useMemo(() => {
    if (hasAgentAccess === "yes") {
      return "ready_now";
    }
    if (knowsAgentSkill === "no" || hasAgentAccess === "no") {
      return "needs_learning";
    }
    if (knowsAgentSkill === "yes" && hasAgentAccess === null) {
      return "halfway";
    }
    return "start";
  }, [hasAgentAccess, knowsAgentSkill]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(AGENT_PROMPT);
    setCopiedPrompt(true);
    captureClientEvent("agent_first_prompt_copied", { surface: "agent_first_quiz" });
  }

  function answerAgentSkill(value: Exclude<AgentSkillAnswer, null>) {
    setKnowsAgentSkill(value);
    captureClientEvent("agent_first_question_answered", {
      question: "knows_agent_skill",
      answer: value,
    });
  }

  function answerAgentAccess(value: Exclude<AgentAccessAnswer, null>) {
    setHasAgentAccess(value);
    captureClientEvent("agent_first_question_answered", {
      question: "has_agent_access",
      answer: value,
    });
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <LandingPageView page="/agent-first" variant="agent-first" />
      <div aria-hidden className="marketing-noise" />
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink)]/70">
              Start here
            </p>
            <h1 className="mt-4 max-w-4xl font-editorial-sans text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Skillfully helps you make better agent skills.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--ink)]/75 sm:text-lg">
              Answer two quick questions and we will point you to the fastest next step.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LandingAuthLink
                href="/dashboard/getting-started"
                intent="sign_in"
                surface="agent_first_hero"
                analytics={{ variant: "agent-first" }}
                className={PRIMARY_BUTTON}
              >
                Open guided setup
              </LandingAuthLink>
              <Link href="/guide/start-with-agent-skills" className={SECONDARY_BUTTON}>
                Learn the basics
              </Link>
            </div>
          </div>
          <aside className={`${PANEL} p-5`}>
            <p className="font-editorial-mono text-xs font-bold uppercase tracking-[0.16em]">Why this flow</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--ink)]/75">
              <li>Skip the full landing page if you already know what you want to build.</li>
              <li>Get a copy-paste prompt if you already have an agent ready to text.</li>
              <li>Fall back to the guide if you are still learning the basics.</li>
            </ul>
          </aside>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className={`${PANEL} p-6 sm:p-7`}>
            <p className="font-editorial-mono text-xs font-bold uppercase tracking-[0.16em]">Quick quiz</p>
            <div className="mt-6 border-t border-[var(--ink)]/15 pt-6">
              <h2 className="font-editorial-sans text-2xl font-semibold">Do you know what an agent skill is?</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink)]/75">
                A reusable instruction set that helps an agent do one job well, consistently.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <ChoiceButton
                  label="Yes, continue"
                  isActive={knowsAgentSkill === "yes"}
                  onClick={() => answerAgentSkill("yes")}
                />
                <ChoiceButton
                  label="No, learn"
                  isActive={knowsAgentSkill === "no"}
                  onClick={() => answerAgentSkill("no")}
                />
              </div>
              {knowsAgentSkill === "no" ? (
                <div className="mt-4 border border-dashed border-[var(--ink)]/35 bg-[var(--white)] p-4 text-sm leading-6 text-[var(--ink)]/80">
                  Start with the short guide, then come back when you are ready to make your first draft.
                  <div className="mt-3">
                    <Link href="/guide/start-with-agent-skills" className="font-editorial-mono text-xs font-bold uppercase underline">
                      Read what an agent skill is
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-8 border-t border-[var(--ink)]/15 pt-6">
              <h2 className="font-editorial-sans text-2xl font-semibold">Do you have an agent you can text right now?</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink)]/75">
                If yes, we can give you a prompt to generate the rough draft before you open the editor.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <ChoiceButton
                  label="Yes, copy agent prompt"
                  isActive={hasAgentAccess === "yes"}
                  onClick={() => answerAgentAccess("yes")}
                />
                <ChoiceButton
                  label="No, learn"
                  isActive={hasAgentAccess === "no"}
                  onClick={() => answerAgentAccess("no")}
                />
              </div>
              {hasAgentAccess === "yes" ? (
                <div className="mt-4 border border-dashed border-[var(--ink)]/35 bg-[var(--white)] p-4">
                  <p className="text-sm leading-6 text-[var(--ink)]/80">
                    Paste this into your agent, then bring the result into Skillfully when you open guided setup.
                  </p>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap border border-[var(--ink)]/15 bg-[var(--paper)] p-3 font-editorial-mono text-xs leading-6 text-[var(--ink)]/85">
                    {AGENT_PROMPT}
                  </pre>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button type="button" className={PRIMARY_BUTTON} onClick={() => void copyPrompt()}>
                      {copiedPrompt ? "Copied prompt" : "Copy prompt"}
                    </button>
                    <LandingAuthLink
                      href="/dashboard/getting-started"
                      intent="sign_in"
                      surface="agent_first_quiz"
                      analytics={{ variant: "agent-first", path: "copy_prompt" }}
                      className={SECONDARY_BUTTON}
                    >
                      Open guided setup
                    </LandingAuthLink>
                  </div>
                </div>
              ) : null}
              {hasAgentAccess === "no" ? (
                <div className="mt-4 border border-dashed border-[var(--ink)]/35 bg-[var(--white)] p-4 text-sm leading-6 text-[var(--ink)]/80">
                  No problem. Read the basics first, then use guided setup to create the first draft inside Skillfully.
                </div>
              ) : null}
            </div>
          </div>

          <aside className={`${PANEL} p-6`}>
            <p className="font-editorial-mono text-xs font-bold uppercase tracking-[0.16em]">Recommended next step</p>
            <h2 className="mt-4 font-editorial-sans text-2xl font-semibold">
              {quizState === "ready_now"
                ? "Start with your agent"
                : quizState === "needs_learning"
                  ? "Learn, then build"
                  : quizState === "halfway"
                    ? "One more step"
                    : "Take the fastest path"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink)]/75">
              {quizState === "ready_now"
                ? "Use the prompt, then open guided setup to turn the draft into a real skill."
                : quizState === "needs_learning"
                  ? "Read the guide first so the editor makes sense when you get there."
                  : quizState === "halfway"
                    ? "If you already know what a skill is, decide whether you want to start from your agent or inside Skillfully."
                    : "If you already know what you want to build, jump straight into guided setup. Otherwise start with the guide."}
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <LandingAuthLink
                href="/dashboard/getting-started"
                intent="sign_in"
                surface="agent_first_sidebar"
                analytics={{ variant: "agent-first", quiz_state: quizState }}
                className={PRIMARY_BUTTON}
              >
                Open guided setup
              </LandingAuthLink>
              <Link href="/" className={SECONDARY_BUTTON}>
                See regular landing page
              </Link>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
