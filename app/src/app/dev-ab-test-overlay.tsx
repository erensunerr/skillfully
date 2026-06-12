"use client";

import { useEffect, useState } from "react";

import { AB_TEST_DEFINITIONS } from "@/lib/ab-test-registry";
import {
  AGENT_FIRST_TRANSITION_CHANGE_EVENT,
  AGENT_FIRST_TRANSITION_MODES,
  AGENT_FIRST_TRANSITION_STORAGE_KEY,
  DEFAULT_AGENT_FIRST_TRANSITION_MODE,
  normalizeAgentFirstTransitionMode,
  type AgentFirstTransitionMode,
} from "@/lib/agent-first-transition";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getCookieValue(cookieName: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${cookieName}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function setVariantCookie(cookieName: string, value: string) {
  document.cookie = `${cookieName}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SECONDS}`;
}

function clearVariantCookie(cookieName: string) {
  document.cookie = `${cookieName}=; Path=/; SameSite=Lax; Max-Age=0`;
}

function getStoredTransitionMode() {
  if (typeof window === "undefined") {
    return DEFAULT_AGENT_FIRST_TRANSITION_MODE;
  }

  return normalizeAgentFirstTransitionMode(window.localStorage.getItem(AGENT_FIRST_TRANSITION_STORAGE_KEY));
}

function setStoredTransitionMode(value: AgentFirstTransitionMode) {
  window.localStorage.setItem(AGENT_FIRST_TRANSITION_STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent(AGENT_FIRST_TRANSITION_CHANGE_EVENT, { detail: { value } }));
}

export function DevABTestOverlay({
  enabled = process.env.NODE_ENV === "development",
  defaultOpen = false,
}: {
  enabled?: boolean;
  defaultOpen?: boolean;
} = {}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeVariants, setActiveVariants] = useState<Record<string, string | null>>({});
  const [activeTransitionMode, setActiveTransitionMode] = useState<AgentFirstTransitionMode>(
    DEFAULT_AGENT_FIRST_TRANSITION_MODE,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setActiveVariants(
      Object.fromEntries(AB_TEST_DEFINITIONS.map((test) => [test.key, getCookieValue(test.cookieName)])),
    );
    setActiveTransitionMode(getStoredTransitionMode());
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  function reloadWithVariant(cookieName: string, value: string | null) {
    if (value) {
      setVariantCookie(cookieName, value);
    } else {
      clearVariantCookie(cookieName);
    }

    window.location.reload();
  }

  function updateTransitionMode(value: AgentFirstTransitionMode) {
    setStoredTransitionMode(value);
    setActiveTransitionMode(value);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[1000] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 font-editorial-mono text-xs">
      {isOpen ? (
        <section className="w-[min(22rem,calc(100vw-2rem))] border border-[#0b5f2a] bg-[#f7fff9] text-[#063016] shadow-[4px_4px_0_rgba(6,48,22,0.35)]">
          <header className="flex items-center justify-between border-b border-[#0b5f2a] px-3 py-2">
            <div>
              <p className="font-bold uppercase">A/B test overlay</p>
              <p className="mt-1 text-[0.65rem] text-[#3a6b49]">Local development only</p>
            </div>
            <button
              type="button"
              className="border border-[#0b5f2a] px-2 py-1 font-bold uppercase hover:bg-[#d7f8df]"
              onClick={() => setIsOpen(false)}
            >
              close
            </button>
          </header>
          <div className="space-y-4 p-3">
            {AB_TEST_DEFINITIONS.map((test) => {
              const activeVariant = activeVariants[test.key];

              return (
                <div key={test.key} className="space-y-2">
                  <div>
                    <p className="font-bold">{test.label}</p>
                    <p className="mt-1 break-all text-[0.65rem] text-[#3a6b49]">{test.key}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {test.variants.map((variant) => {
                      const isActive = activeVariant === variant.value;

                      return (
                        <button
                          key={variant.value}
                          type="button"
                          aria-pressed={isActive}
                          className={[
                            "border px-3 py-2 font-bold uppercase",
                            isActive
                              ? "border-[#063016] bg-[#0bb84f] text-[#031609]"
                              : "border-[#0b5f2a] bg-white text-[#063016] hover:bg-[#d7f8df]",
                          ].join(" ")}
                          onClick={() => reloadWithVariant(test.cookieName, variant.value)}
                        >
                          {variant.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className={[
                        "border px-3 py-2 font-bold uppercase",
                        activeVariant
                          ? "border-[#0b5f2a] bg-white text-[#063016] hover:bg-[#d7f8df]"
                          : "border-[#063016] bg-[#0bb84f] text-[#031609]",
                      ].join(" ")}
                      onClick={() => reloadWithVariant(test.cookieName, null)}
                    >
                      auto
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="space-y-2 border-t border-[#0b5f2a] pt-3">
              <div>
                <p className="font-bold">Agent-first transition</p>
                <p className="mt-1 text-[0.65rem] text-[#3a6b49]">Local animation preview</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {AGENT_FIRST_TRANSITION_MODES.map((mode) => {
                  const isActive = activeTransitionMode === mode.value;

                  return (
                    <button
                      key={mode.value}
                      type="button"
                      aria-pressed={isActive}
                      className={[
                        "border px-3 py-2 font-bold uppercase",
                        isActive
                          ? "border-[#063016] bg-[#0bb84f] text-[#031609]"
                          : "border-[#0b5f2a] bg-white text-[#063016] hover:bg-[#d7f8df]",
                      ].join(" ")}
                      onClick={() => updateTransitionMode(mode.value)}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        className="grid h-12 w-12 place-items-center border border-[#063016] bg-[#0bb84f] font-bold lowercase text-[#031609] shadow-[3px_3px_0_rgba(6,48,22,0.45)] hover:bg-[#22d465] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#063016]"
        onClick={() => setIsOpen((current) => !current)}
      >
        dev
      </button>
    </div>
  );
}
