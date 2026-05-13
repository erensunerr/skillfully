"use client";

import { useEffect } from "react";
import Link from "next/link";
import { captureClientEvent } from "@/lib/client-analytics";

const BRUTAL_BUTTON =
  "border-4 border-black bg-black px-4 py-2 text-sm font-black uppercase text-white transition-all hover:bg-yellow-300 hover:text-black";

function GitHubMark() {
  return (
    <svg
      aria-hidden
      className="h-16 w-16"
      viewBox="0 0 98 96"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M49 0C21.9 0 0 22 0 49.1c0 21.7 14 40.1 33.5 46.6 2.4.5 3.3-1.1 3.3-2.4 0-1.2 0-4.2-.1-8.3-13.6 3-16.5-6.6-16.5-6.6-2.2-5.7-5.4-7.2-5.4-7.2-4.5-3.1.3-3 .3-3 4.9.3 7.5 5.1 7.5 5.1 4.4 7.5 11.5 5.3 14.3 4.1.4-3.2 1.7-5.3 3.1-6.5-10.9-1.2-22.3-5.5-22.3-24.3 0-5.4 1.9-9.8 5.1-13.2-.5-1.2-2.2-6.2.5-13 0 0 4.1-1.3 13.5 5.1 3.9-1.1 8.1-1.6 12.3-1.6s8.4.5 12.3 1.6c9.4-6.4 13.5-5.1 13.5-5.1 2.7 6.8 1 11.8.5 13 3.2 3.4 5.1 7.8 5.1 13.2 0 18.9-11.5 23-22.4 24.2 1.8 1.5 3.3 4.5 3.3 9.1 0 6.6-.1 11.9-.1 13.5 0 1.3.9 2.9 3.4 2.4C84 89.1 98 70.8 98 49.1 98 22 76.1 0 49 0Z" />
    </svg>
  );
}

function DocumentPlusIcon() {
  return (
    <svg
      aria-hidden
      className="h-16 w-16"
      viewBox="0 0 64 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2H42L62 22V78H12V2Z" />
      <path d="M42 2V22H62" />
      <path d="M32 37V63M19 50H45" />
    </svg>
  );
}

export function OnboardingModal({
  onClose,
  onConnectGitHub,
  onCreateSkill,
}: {
  onClose: () => void;
  onConnectGitHub: () => void;
  onCreateSkill: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 px-3 py-6 backdrop-blur-[1px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-modal-title"
        className="relative my-auto w-full max-w-[860px] border-4 border-black bg-[#fffdf8] text-black shadow-[10px_10px_0_rgba(0,0,0,0.28)]"
      >
        <button
          type="button"
          aria-label="Close onboarding"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center border-2 border-black bg-white font-mono text-lg font-black leading-none transition-all hover:bg-black hover:text-white"
          onClick={onClose}
        >
          ×
        </button>

        <div className="px-6 pb-6 pt-7 sm:px-8 sm:pb-7">
          <p className="font-mono text-sm font-black uppercase">01. Get started</p>
          <h2
            id="onboarding-modal-title"
            className="mt-5 max-w-[14ch] text-4xl font-black uppercase leading-[0.95] sm:text-5xl lg:text-6xl"
          >
            How do you want to start?
          </h2>
          <p className="mt-3 text-base font-semibold">
            Set up your first tracked skill in two ways.
          </p>

          <div className="mt-7 grid gap-6 md:grid-cols-2 md:gap-0">
            <article className="md:border-r-2 md:border-black md:pr-10">
              <p className="font-mono text-sm font-black uppercase">Import</p>
              <h3 className="mt-3 text-2xl font-bold">Already have a skill?</h3>
              <p className="mt-2 max-w-[26ch] font-mono text-sm leading-6">
                Import an existing skill from GitHub and start collecting feedback.
              </p>
              <div className="mt-7 text-black">
                <GitHubMark />
              </div>
              <button
                type="button"
                className={`${BRUTAL_BUTTON} mt-5 w-full`}
                onClick={() => {
                  captureClientEvent("onboarding_github_connect_clicked");
                  onConnectGitHub();
                }}
              >
                Connect GitHub
              </button>
            </article>

            <article className="border-t-2 border-black pt-6 md:border-t-0 md:pl-10 md:pt-0">
              <p className="font-mono text-sm font-black uppercase">Create</p>
              <h3 className="mt-3 text-2xl font-bold">Create your first skill</h3>
              <p className="mt-2 max-w-[26ch] font-mono text-sm leading-6">
                Start from scratch and generate a trackable skill in minutes.
              </p>
              <div className="mt-7 text-black">
                <DocumentPlusIcon />
              </div>
              <button
                type="button"
                className={`${BRUTAL_BUTTON} mt-5 w-full`}
                onClick={() => {
                  captureClientEvent("onboarding_create_skill_clicked");
                  onCreateSkill();
                }}
              >
                Create skill
              </button>
            </article>
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t-4 border-black px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-mono text-base font-black uppercase">New to agent skills?</p>
          <Link
            href="/guide"
            className="inline-flex items-center gap-4 font-mono text-base font-black uppercase underline underline-offset-4"
            onClick={() => captureClientEvent("onboarding_guide_clicked")}
          >
            Read the guide
            <span aria-hidden className="text-3xl leading-none">
              -&gt;
            </span>
          </Link>
        </footer>
      </section>
    </div>
  );
}
