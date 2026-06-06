"use client";

import Link from "next/link";
import { useState } from "react";

import {
  type AgentAccessAnswer,
  type AgentSkillAnswer,
  getAgentFirstQuizState,
  shouldAskAgentAccess,
} from "@/lib/agent-first-quiz";
import { captureClientEvent } from "@/lib/client-analytics";

import { LandingAuthLink, LandingPageView } from "../landing-analytics";

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 font-editorial-sans text-sm font-semibold !text-white transition hover:bg-[var(--paper)] hover:!text-[var(--ink)]";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center border border-[var(--ink)] bg-[var(--paper)] px-5 py-3 font-editorial-sans text-sm font-semibold !text-[var(--ink)] transition hover:bg-[var(--white)]";
const PANEL = "border border-[var(--ink)] bg-[var(--paper)]";

const AGENT_PROMPT = `Help me create my first agent skill. Ask me 5 short questions about who the skill is for, what job it should do, one example task, what good output looks like, and common failure modes. Then draft a short SKILL.md outline I can paste into Skillfully.`;
const LEARN_SKILLS_HREF = "/guide/start-with-agent-skills";

function ChoiceButton({
  label,
  isActive,
  onClick,
  href,
}: {
  label: string;
  isActive: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const className = `${isActive ? PRIMARY_BUTTON : SECONDARY_BUTTON} w-full sm:w-auto`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  );
}

export function AgentFirstLanding() {
  const [knowsAgentSkill, setKnowsAgentSkill] = useState<AgentSkillAnswer>(null);
  const [hasAgentAccess, setHasAgentAccess] = useState<AgentAccessAnswer>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const quizState = getAgentFirstQuizState(knowsAgentSkill, hasAgentAccess);
  const showAgentAccessQuestion = shouldAskAgentAccess(knowsAgentSkill);
  const currentStep = showAgentAccessQuestion ? "2 of 2" : "1 of 2";

  async function copyPrompt() {
    await navigator.clipboard.writeText(AGENT_PROMPT);
    setCopiedPrompt(true);
    captureClientEvent("agent_first_prompt_copied", { surface: "agent_first_quiz" });
  }

  function answerAgentSkill(value: Exclude<AgentSkillAnswer, null>) {
    setKnowsAgentSkill(value);
    setHasAgentAccess(null);
    setCopiedPrompt(false);
    captureClientEvent("agent_first_question_answered", {
      question: "knows_agent_skill",
      answer: value,
    });
  }

  function answerAgentAccess(value: Exclude<AgentAccessAnswer, null>) {
    setHasAgentAccess(value);
    setCopiedPrompt(false);
    captureClientEvent("agent_first_question_answered", {
      question: "has_agent_access",
      answer: value,
    });
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-5 py-8 text-[var(--ink)] sm:px-8 sm:py-12">
      <LandingPageView page="/agent-first" variant="agent-first" />
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center justify-center">
        <div className={`${PANEL} w-full p-6 sm:p-8`}>
          <div className="border-b border-[var(--ink)]/15 pb-5">
            <p className="font-editorial-mono text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink)]/65">
              Step {currentStep}
            </p>
            <h1 className="mt-4 font-editorial-sans text-3xl font-bold leading-tight sm:text-5xl">
              Skillfully helps you make better agent skills.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ink)]/75 sm:text-base">
              Two questions. Then we point you to the right next step.
            </p>
          </div>

          <div className="mt-6">
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
              <ChoiceButton label="No, learn first" isActive={false} href={LEARN_SKILLS_HREF} />
            </div>

          </div>

          {showAgentAccessQuestion ? (
            <div className="mt-8 border-t border-[var(--ink)]/15 pt-6">
              <p className="font-editorial-mono text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink)]/65">
                Great. One last question.
              </p>
              <h2 className="mt-3 font-editorial-sans text-2xl font-semibold">Do you have an agent that you can text right now?</h2>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <ChoiceButton
                  label="Yes, copy prompt"
                  isActive={hasAgentAccess === "yes"}
                  onClick={() => answerAgentAccess("yes")}
                />
                <ChoiceButton
                  label="No, how to set up an agent"
                  isActive={false}
                  href={LEARN_SKILLS_HREF}
                />
              </div>

              {hasAgentAccess === "yes" ? (
                <div className="mt-4 border border-dashed border-[var(--ink)]/35 bg-[var(--white)] p-4">
                  <p className="text-sm leading-6 text-[var(--ink)]/80">
                    Paste this into your agent, then open guided setup to turn the draft into a real skill.
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
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
