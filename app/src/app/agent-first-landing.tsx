"use client";

import { useEffect, useRef, useState } from "react";

import { captureClientEvent } from "@/lib/client-analytics";
import {
  AGENT_FIRST_TRANSITION_CHANGE_EVENT,
  AGENT_FIRST_TRANSITION_STORAGE_KEY,
  DEFAULT_AGENT_FIRST_TRANSITION_MODE,
  normalizeAgentFirstTransitionMode,
  type AgentFirstTransitionMode,
} from "@/lib/agent-first-transition";

import { BookingModalCta } from "./booking-modal";
import { LandingPageView } from "./landing-analytics";
import { PublicHeader } from "./public-header";

const PRIMARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#f4f4ef] bg-[#f4f4ef] px-5 py-3 text-center font-editorial-sans text-sm font-semibold text-[#080808] transition hover:bg-transparent hover:text-[#f4f4ef]";
const SECONDARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#3a3a3a] bg-transparent px-5 py-3 text-center font-editorial-sans text-sm font-semibold text-[#f4f4ef] transition hover:border-[#f4f4ef]";
const TERTIARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#3a3a3a] bg-[#171717] px-5 py-3 text-center font-editorial-sans text-sm font-semibold text-[#f4f4ef] transition hover:border-[#f4f4ef] hover:bg-[#1f1f1f]";

const AGENT_PROMPT = `Install the skillfully skill from erensunerr/skillfully. Help me create an account and connect my first agent skill.`;
const AGENT_SKILL_EXPLANATION =
  "Agent skills are playbooks / SOPs for AI agents. They allow you to inject your expertise into the agent.";
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>[]{}";

function ChoiceButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  const className = `${isActive ? PRIMARY_BUTTON : SECONDARY_BUTTON} w-full sm:w-auto`;

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

function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function syncMotionPreference() {
      setPrefersReducedMotion(motionQuery.matches);
    }

    syncMotionPreference();
    motionQuery.addEventListener("change", syncMotionPreference);

    return () => motionQuery.removeEventListener("change", syncMotionPreference);
  }, []);

  return prefersReducedMotion;
}

function useAgentFirstTransitionMode() {
  const [transitionMode, setTransitionMode] = useState<AgentFirstTransitionMode>(
    DEFAULT_AGENT_FIRST_TRANSITION_MODE,
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    function readStoredMode() {
      setTransitionMode(
        normalizeAgentFirstTransitionMode(window.localStorage.getItem(AGENT_FIRST_TRANSITION_STORAGE_KEY)),
      );
    }

    function handleTransitionChange(event: Event) {
      const customEvent = event as CustomEvent<{ value?: unknown }>;
      setTransitionMode(normalizeAgentFirstTransitionMode(customEvent.detail?.value));
    }

    function handleStorageChange(event: StorageEvent) {
      if (event.key === AGENT_FIRST_TRANSITION_STORAGE_KEY) {
        setTransitionMode(normalizeAgentFirstTransitionMode(event.newValue));
      }
    }

    readStoredMode();
    window.addEventListener(AGENT_FIRST_TRANSITION_CHANGE_EVENT, handleTransitionChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(AGENT_FIRST_TRANSITION_CHANGE_EVENT, handleTransitionChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return transitionMode;
}

function randomScrambleChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

function DecodingQuestionText({
  text,
  enabled,
}: {
  text: string;
  enabled: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const previousTextRef = useRef(text);
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    if (!enabled || prefersReducedMotion || previousTextRef.current === text) {
      previousTextRef.current = text;
      setDisplayText(text);
      return;
    }

    const previousText = previousTextRef.current;
    const maxLength = Math.max(previousText.length, text.length);
    const durationMs = 520;
    let animationFrame = 0;
    let startedAt = 0;

    function animate(now: number) {
      if (!startedAt) {
        startedAt = now;
      }

      const progress = Math.min((now - startedAt) / durationMs, 1);
      const resolvedCharacters = Math.floor(progress * maxLength);
      const nextText = Array.from({ length: maxLength }, (_, index) => {
        const targetCharacter = text[index] ?? "";

        if (index < resolvedCharacters || progress === 1) {
          return targetCharacter;
        }

        if (targetCharacter === " ") {
          return " ";
        }

        return targetCharacter ? randomScrambleChar() : "";
      }).join("");

      setDisplayText(nextText.trimEnd());

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      } else {
        previousTextRef.current = text;
        setDisplayText(text);
      }
    }

    animationFrame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [enabled, prefersReducedMotion, text]);

  return <span aria-hidden={enabled}>{enabled ? displayText : text}</span>;
}

function transitionPanelClass(mode: AgentFirstTransitionMode) {
  if (mode === "fade-swap") {
    return "agent-first-fade-swap";
  }

  if (mode === "letter-decode") {
    return "agent-first-letter-decode";
  }

  return "agent-first-soft-rewrite";
}

export function AgentFirstLanding() {
  const [knowsAgentSkill, setKnowsAgentSkill] = useState<"yes" | "no" | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const transitionMode = useAgentFirstTransitionMode();

  const currentStep = knowsAgentSkill ? "2 of 2" : "1 of 2";
  const isAgentAccessStep = knowsAgentSkill !== null;
  const questionText = isAgentAccessStep
    ? "Do you have an agent that you can text right now?"
    : "Do you know what an agent skill is?";
  const contentKey = isAgentAccessStep ? `agent-access-${knowsAgentSkill}` : "agent-skill";
  const panelKey = transitionMode === "letter-decode" ? "letter-decode-panel" : `${transitionMode}-${contentKey}`;

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
    setKnowsAgentSkill("no");
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
    <main className="flex h-screen flex-col overflow-hidden bg-[#0f0f0f] text-[#f4f4ef]">
      <LandingPageView page="/" variant="agent-first" />
      <PublicHeader showBookingCta={false} theme="dark" />
      <section className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 items-start px-6 py-8 sm:items-center sm:px-10 sm:py-10">
        <div className="w-full">
          <p className="font-editorial-mono text-xs font-bold uppercase tracking-[0.16em] text-[#a1a1a1]">
            Step {currentStep}
          </p>
          <h1 className="mt-4 max-w-2xl font-editorial-sans text-3xl font-bold leading-tight sm:text-5xl">
            Skillfully helps you make better agent skills.
          </h1>

          <div className="relative mt-8 min-h-[18rem] overflow-hidden">
            <div
              key={panelKey}
              className={`agent-first-transition-panel flex min-h-[18rem] flex-col justify-start sm:justify-center ${transitionPanelClass(transitionMode)}`}
              data-agent-first-transition={transitionMode}
            >
              {knowsAgentSkill === "no" ? (
                <p className="mb-5 max-w-xl text-sm leading-6 text-[#cfcfcf]">
                  {AGENT_SKILL_EXPLANATION}
                </p>
              ) : null}
              <h2
                aria-label={questionText}
                className="font-editorial-sans text-2xl font-semibold sm:text-4xl"
              >
                <DecodingQuestionText text={questionText} enabled={transitionMode === "letter-decode"} />
              </h2>
              <div key={`controls-${contentKey}`} className="agent-first-controls-in mt-6 flex flex-col gap-3 sm:flex-row">
                {isAgentAccessStep ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <ChoiceButton label="Yes, continue" isActive={knowsAgentSkill === "yes"} onClick={answerAgentSkill} />
                    <ChoiceButton label="No, learn first" isActive={knowsAgentSkill === "no"} onClick={answerAgentSkillNo} />
                  </>
                )}
              </div>

              {copiedPrompt ? (
                <p className="agent-first-controls-in mt-5 text-sm leading-6 text-[#cfcfcf]">
                  Prompt copied. Paste it into your agent, then create your account in Skillfully.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
