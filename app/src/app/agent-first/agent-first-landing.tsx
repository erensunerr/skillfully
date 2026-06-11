"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { captureClientEvent } from "@/lib/client-analytics";

import { BookingModalCta } from "../booking-modal";
import { LandingPageView } from "../landing-analytics";

const PRIMARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#f4f4ef] bg-[#f4f4ef] px-5 py-3 text-center font-editorial-sans text-sm font-semibold text-[#080808] transition hover:bg-transparent hover:text-[#f4f4ef]";
const SECONDARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#3a3a3a] bg-transparent px-5 py-3 text-center font-editorial-sans text-sm font-semibold text-[#f4f4ef] transition hover:border-[#f4f4ef]";
const TERTIARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#3a3a3a] bg-[#171717] px-5 py-3 text-center font-editorial-sans text-sm font-semibold text-[#f4f4ef] transition hover:border-[#f4f4ef] hover:bg-[#1f1f1f]";

const AGENT_PROMPT = `Install the skillfully skill from erensunerr/skillfully. Help me create an account and connect my first agent skill.`;
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
      <Link href={href} className={className} onClick={onClick}>
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

async function writePromptToClipboard(prompt: string) {
  try {
    await navigator.clipboard.writeText(prompt);
    return true;
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = prompt;
    textArea.setAttribute("readonly", "true");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

export function AgentFirstLanding() {
  const [knowsAgentSkill, setKnowsAgentSkill] = useState<"yes" | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const currentStep = knowsAgentSkill === "yes" ? "2 of 2" : "1 of 2";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function copyPrompt() {
    const copied = await writePromptToClipboard(AGENT_PROMPT);

    if (!copied) {
      return;
    }

    setCopiedPrompt(true);
    captureClientEvent("agent_first_prompt_copied", { surface: "agent_first_quiz" });
  }

  function answerAgentSkill() {
    setKnowsAgentSkill("yes");
    setCopiedPrompt(false);
    captureClientEvent("agent_first_question_answered", {
      surface: "agent_first_quiz",
      question: "knows_agent_skill",
      answer: "yes",
    });
  }

  function answerAgentSkillNo() {
    captureClientEvent("agent_first_question_answered", {
      surface: "agent_first_quiz",
      question: "knows_agent_skill",
      answer: "no",
    });
  }

  async function answerAgentAccessYes() {
    captureClientEvent("agent_first_question_answered", {
      surface: "agent_first_quiz",
      question: "has_agent_access",
      answer: "yes",
    });

    await copyPrompt();
  }

  function answerAgentAccessNo() {
    captureClientEvent("agent_first_question_answered", {
      surface: "agent_first_quiz",
      question: "has_agent_access",
      answer: "no",
    });
  }

  return (
    <main className="h-screen overflow-hidden bg-[#0f0f0f] px-6 py-8 text-[#f4f4ef] sm:px-10 sm:py-10">
      <LandingPageView page="/" variant="agent-first" />
      <section className="mx-auto flex h-full w-full max-w-3xl items-start pt-10 sm:items-center sm:pt-0">
        <div className="w-full">
          <p className="font-editorial-mono text-xs font-bold uppercase tracking-[0.16em] text-[#a1a1a1]">
            Step {currentStep}
          </p>
          <h1 className="mt-4 max-w-2xl font-editorial-sans text-3xl font-bold leading-tight sm:text-5xl">
            Skillfully helps you make better agent skills.
          </h1>

          <div className="relative mt-8 min-h-[18rem] overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 flex w-full transition-transform duration-500 ease-out ${knowsAgentSkill === "yes" ? "-translate-x-full" : "translate-x-0"}`}
            >
              <div className="min-w-full pr-6 sm:pr-10">
                <div className="flex min-h-[18rem] flex-col justify-center">
                  <h2 className="font-editorial-sans text-2xl font-semibold sm:text-4xl">
                    Do you know what an agent skill is?
                  </h2>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <ChoiceButton label="Yes, continue" isActive={knowsAgentSkill === "yes"} onClick={answerAgentSkill} />
                    <ChoiceButton label="No, learn first" isActive={false} href={LEARN_SKILLS_HREF} onClick={answerAgentSkillNo} />
                  </div>
                </div>
              </div>

              <div className="min-w-full">
                <div className="flex min-h-[18rem] flex-col justify-start sm:justify-center">
                  <h2 className="font-editorial-sans text-2xl font-semibold sm:text-4xl">
                    Do you have an agent that you can text right now?
                  </h2>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      className={`${copiedPrompt ? PRIMARY_BUTTON : SECONDARY_BUTTON} w-full sm:w-auto`}
                      onClick={() => void answerAgentAccessYes()}
                    >
                      {copiedPrompt ? "Prompt copied" : "Yes, copy prompt"}
                    </button>
                    <BookingModalCta
                      surface="agent_first_quiz"
                      className={`${TERTIARY_BUTTON} w-full sm:w-auto`}
                      onOpen={answerAgentAccessNo}
                    >
                      No, book a free setup call
                    </BookingModalCta>
                  </div>

                  <div className="mt-5 min-h-12">
                    {copiedPrompt ? (
                      <p className="text-sm leading-6 text-[#cfcfcf]">
                        Prompt copied. Paste it into your agent, then create your account in Skillfully.
                      </p>
                    ) : (
                      <p className="text-sm leading-6 text-[#8d8d8d]">
                        If you already have an agent, we&apos;ll copy the exact prompt for you.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
