"use client";

import Link from "next/link";
import { DropdownChevron } from "@/components/branded-select";
import { captureClientEvent } from "@/lib/client-analytics";
import { canOpenSkillTab } from "./view-state";
import type { AppUser, DashboardTab, Skill } from "./dashboard-model";
import { displayUserEmail, isSharedSkill, skillAccessLabel, skillInitials, SKILLS_GUIDE_PATH } from "./dashboard-model";
import { BrandMark, DashboardIcon } from "./dashboard-icons";

export function SkillSelector({
  skills,
  selectedId,
  isOpen,
  onToggle,
  onSelect,
  onCreateSkill,
}: {
  skills: Skill[];
  selectedId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (skill: Skill) => void;
  onCreateSkill: () => void;
}) {
  const skillOptions = [
    ...skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description || "Skillfully skill",
      accessLabel: skillAccessLabel(skill),
      isShared: isSharedSkill(skill),
      skill,
    })),
  ];
  const selectedOption =
    skillOptions.find((option) => option.id === selectedId) ?? skillOptions[0] ?? null;

  return (
    <div className="relative z-50 min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex w-full min-w-0 items-center justify-between gap-3 border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-left font-editorial-mono text-sm transition hover:bg-[var(--white)]"
        onClick={onToggle}
      >
        <span className="min-w-0">
          <span className="block truncate">{selectedOption?.name ?? "No skills yet"}</span>
          {selectedOption?.isShared ? (
            <span className="mt-1 flex flex-wrap gap-2 font-editorial-sans text-[0.68rem]">
              <span className="border border-[var(--ink)] bg-[var(--white)] px-2 py-0.5">Shared</span>
              <span className="border border-[var(--ink)]/45 px-2 py-0.5">{selectedOption.accessLabel}</span>
            </span>
          ) : null}
        </span>
        <DropdownChevron open={isOpen} />
      </button>

      {isOpen ? (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.45rem)] z-[100] w-[min(18rem,calc(100vw-2.5rem))] border border-[var(--ink)] bg-[var(--white)] p-2 shadow-[6px_6px_0_var(--ink)]"
        >
          <div className="max-h-[min(28rem,calc(100vh-14rem))] space-y-1 overflow-y-auto overscroll-contain pr-1">
            {skillOptions.length === 0 ? (
              <p className="px-3 py-3 font-editorial-mono text-xs uppercase text-[var(--ink)]/65">
                No skills yet.
              </p>
            ) : null}
            {skillOptions.map((option) => {
              const isSelected =
                option.id === selectedId ||
                (!selectedId && option.id === selectedOption?.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className="grid w-full grid-cols-[2.25rem_1fr_auto] items-center gap-3 px-2 py-2 text-left text-sm hover:bg-[var(--paper)]"
                  onClick={() => {
                    if (option.skill) {
                      onSelect(option.skill);
                    }
                  }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ink)] font-editorial-mono text-xs font-bold text-[var(--paper)]">
                    {skillInitials(option.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-editorial-mono">{option.name}</span>
                    <span className="block truncate text-xs text-[var(--ink)]/55">{option.description}</span>
                    {option.isShared ? (
                      <span className="mt-1 flex flex-wrap gap-2 font-editorial-sans text-[0.68rem]">
                        <span className="border border-[var(--ink)] bg-[var(--paper)] px-2 py-0.5">Shared</span>
                        <span className="border border-[var(--ink)]/45 px-2 py-0.5">{option.accessLabel}</span>
                      </span>
                    ) : null}
                  </span>
                  {isSelected ? <span aria-hidden className="text-lg leading-none">✓</span> : null}
                </button>
              );
            })}
          </div>
          <div className="mt-2 border-t border-[var(--ink)] pt-2">
            <button
              type="button"
              className="flex w-full items-center gap-3 bg-[var(--paper)] px-3 py-3 text-left font-editorial-mono text-sm hover:bg-[var(--white)]"
              onClick={onCreateSkill}
            >
              <span aria-hidden className="text-2xl leading-none">+</span>
              Create new skill
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DashboardSidebar({
  user,
  skills,
  selectedSkill,
  selectedId,
  activeTab,
  isSkillSelectorOpen,
  onSelect,
  onTabChange,
  onToggleSkillSelector,
  onOpenCreateSkill,
  onSignOut,
}: {
  user: AppUser;
  skills: Skill[];
  selectedSkill?: Skill | null;
  selectedId: string | null;
  activeTab: DashboardTab;
  isSkillSelectorOpen: boolean;
  onSelect: (skill: Skill) => void;
  onTabChange: (tab: DashboardTab) => void;
  onToggleSkillSelector: () => void;
  onOpenCreateSkill: () => void;
  onSignOut: () => void;
}) {
  const navItems = [
    ["overview", "Overview"],
    ["editor", "Editor"],
    ["analytics", "Analytics"],
    ["settings", "Settings"],
  ] satisfies Array<[DashboardTab, string]>;
  const selectedSkillForNav =
    selectedSkill ?? skills.find((skill) => skill.id === selectedId) ?? null;
  const visibleNavItems = navItems.filter(([tab]) => canOpenSkillTab(selectedSkillForNav, tab));

  return (
    <aside className="relative z-40 flex min-h-0 w-full max-w-full min-w-0 flex-col overflow-visible border-b border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-b-0 lg:border-r">
      <div className="border-b border-[var(--ink)] px-5 py-4 lg:py-6">
        <BrandMark />
      </div>

      <div className="min-w-0 px-5 py-4 lg:py-7">
        <p className="mb-3 font-editorial-mono text-xs font-bold uppercase">Skill</p>
        <SkillSelector
          skills={skills}
          selectedId={selectedId}
          isOpen={isSkillSelectorOpen}
          onToggle={onToggleSkillSelector}
          onSelect={onSelect}
          onCreateSkill={onOpenCreateSkill}
        />
      </div>

      <nav className="grid grid-cols-2 border-y border-[var(--ink)] font-editorial-sans text-sm sm:grid-cols-4 lg:block">
        {visibleNavItems.map(([tab, label]) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              className={`flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left lg:px-5 lg:py-4 ${
                isActive
                  ? "border-[var(--ink)] bg-[var(--ink)] font-semibold text-[var(--paper)]"
                  : "border-transparent hover:bg-[var(--white)]"
              }`}
              onClick={() => onTabChange(tab)}
            >
              <DashboardIcon name={tab} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:mt-auto lg:block lg:space-y-5 lg:py-6">
        <button
          type="button"
          className="flex w-full items-center gap-3 border border-[var(--ink)] px-4 py-3 text-left font-editorial-mono text-sm hover:bg-[var(--white)]"
          onClick={onOpenCreateSkill}
        >
          <span aria-hidden className="text-2xl leading-none">+</span>
          New Skill
        </button>

        <div className="hidden border border-[var(--ink)] p-4 lg:block">
          <p className="font-editorial-mono text-xs font-bold uppercase">Need help?</p>
          <p className="mt-3 text-sm leading-6">
            Read the guide to learn how to build great agent skills.
          </p>
          <Link
            href={SKILLS_GUIDE_PATH}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-block font-editorial-mono text-xs font-bold uppercase underline"
            onClick={() => captureClientEvent("sidebar_guide_clicked")}
          >
            Open Guide <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="min-w-0 space-y-2 sm:col-span-2 lg:space-y-3">
          <button
            type="button"
            className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm ${
              activeTab === "account"
                ? "bg-[var(--ink)] font-semibold text-[var(--paper)]"
                : "border border-[var(--ink)] hover:bg-[var(--white)]"
            }`}
            onClick={() => onTabChange("account")}
          >
            <DashboardIcon name="account" />
            Account Settings
          </button>
          <div className="flex min-w-0 items-center justify-between gap-4 lg:block">
            <p className="min-w-0 truncate font-editorial-mono text-[0.68rem] text-[var(--ink)]/65">
              {displayUserEmail(user)}
            </p>
            <button
              type="button"
              className="shrink-0 font-editorial-mono text-[0.68rem] font-bold uppercase underline lg:mt-2"
              onClick={onSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
