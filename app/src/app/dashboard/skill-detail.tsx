"use client";

import { useState } from "react";
import { buildSkillfullySkillInstallPrompt } from "@/lib/skills/install-prompts";
import { captureClientEvent } from "@/lib/client-analytics";
import type { AppUser, DashboardTab, Feedback, Skill, SkillUsageEvent } from "./dashboard-model";
import { buildPublicInstallPrompt, canEditSkill, isSharedSkill, pluralCount, ratingSummary, skillAccessLabel, usageSummary } from "./dashboard-model";
import { resolveDashboardTabForSkill } from "./view-state";
import { CopyIcon } from "./dashboard-icons";
import { SkillEditorWorkspace } from "./skill-editor-workspace";
import { SkillAnalyticsWorkspace } from "./skill-analytics-workspace";
import { SkillSettingsWorkspace } from "./skill-settings-workspace";
import { MetricCard, PublishingStatus, RecentFeedbackTable, SentimentPanel, UsageChart, VersionSnapshot } from "./skill-overview";

export function SkillDetail({
  skill,
  entries,
  usageEvents = [],
  user,
  onBack,
  activeTab = "overview",
  onTabChange,
  onOpenEditor,
  onSkillUpdated,
  onSkillDeleted,
}: {
  skill: Skill;
  entries: Feedback[];
  usageEvents?: SkillUsageEvent[];
  user?: AppUser | null;
  onBack: () => void;
  activeTab?: DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
  onOpenEditor?: () => void;
  onSkillUpdated?: (skill: Skill) => void;
  onSkillDeleted?: (skill: Skill) => void;
}) {
  const [copiedInstallPrompt, setCopiedInstallPrompt] = useState<"skillfully" | "skill" | null>(null);
  const visibleActiveTab = resolveDashboardTabForSkill(skill, activeTab);
  const hasEditAccess = canEditSkill(skill);
  const sharedAccessLabel = skillAccessLabel(skill);
  const counts = ratingSummary(entries);
  const usageCounts = usageSummary(usageEvents);
  const totalUsageEvents = usageEvents.length;
  const updateChecks = usageCounts.manifest_checked ?? 0;
  const fileLoads = usageCounts.file_loaded ?? 0;
  const totalRated = counts.positive + counts.neutral + counts.negative;
  const successRate =
    totalRated > 0 ? `${Math.round((counts.positive / totalRated) * 1000) / 10}%` : "0%";
  const feedbackReceived = totalRated.toLocaleString();
  const statusLabel = skill.status === "published" || skill.publishedVersionId ? "Published" : "Draft";
  const isPublished = statusLabel === "Published";
  const versionLabel = skill.publishedVersionId
    ? "Published version"
    : skill.currentDraftVersionId
      ? "Draft version"
      : "Not versioned";
  const skillfullySkillInstallPrompt = buildSkillfullySkillInstallPrompt();
  const userSkillInstallPrompt = buildPublicInstallPrompt(skill);

  async function copyInstallPrompt(kind: "skillfully" | "skill", prompt: string) {
    await navigator.clipboard.writeText(prompt);
    captureClientEvent("install_prompt_copied", {
      prompt_kind: kind,
      skill_name: skill.name,
      skill_id: skill.skillId,
    });
    setCopiedInstallPrompt(kind);
    window.setTimeout(() => setCopiedInstallPrompt(null), 1200);
  }

  if (visibleActiveTab === "editor") {
    return (
      <SkillEditorWorkspace
        skill={skill}
        user={user}
        usageEvents={usageEvents}
        onTabChange={onTabChange}
        onSkillUpdated={onSkillUpdated}
      />
    );
  }

  if (visibleActiveTab === "analytics") {
    return <SkillAnalyticsWorkspace entries={entries} usageEvents={usageEvents} />;
  }

  if (visibleActiveTab === "settings") {
    return (
      <SkillSettingsWorkspace
        skill={skill}
        user={user}
        onSkillUpdated={onSkillUpdated}
        onSkillDeleted={onSkillDeleted}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-8 sm:px-8 lg:px-11 lg:py-12">
      <button
        type="button"
        className="font-editorial-mono text-xs font-bold uppercase underline lg:hidden"
        onClick={onBack}
      >
        Back to skills
      </button>

      <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="font-editorial-sans text-5xl font-bold leading-none sm:text-6xl">
              {skill.name}
            </h1>
            <span className="border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 font-editorial-mono text-sm font-bold">
              {versionLabel}
            </span>
            <span className="border border-emerald-800 bg-emerald-50 px-4 py-3 font-editorial-sans text-sm text-emerald-800">
              {statusLabel}
            </span>
            {isSharedSkill(skill) ? (
              <>
                <span className="border border-[var(--ink)] bg-[var(--white)] px-4 py-3 font-editorial-mono text-sm font-bold">
                  Shared
                </span>
                <span className="border border-[var(--ink)]/45 bg-[var(--paper)] px-4 py-3 font-editorial-sans text-sm">
                  {sharedAccessLabel}
                </span>
              </>
            ) : null}
          </div>
          <p className="mt-6 max-w-2xl text-lg leading-8">
            {skill.description || "No description yet."}
          </p>
        </div>

        <div className="grid gap-3 sm:w-72">
          {hasEditAccess ? (
            <button
              type="button"
              className="flex items-center justify-between border border-[var(--ink)] bg-[var(--ink)] px-5 py-4 font-editorial-sans text-base font-semibold text-[var(--paper)] transition hover:bg-[var(--paper)] hover:text-[var(--ink)]"
              onClick={() => {
                captureClientEvent("dashboard_editor_clicked", { skill_name: skill.name });
                if (onTabChange) {
                  onTabChange("editor");
                } else {
                  onOpenEditor?.();
                }
              }}
            >
              Go to Editor
              <span aria-hidden className="text-3xl leading-none">→</span>
            </button>
          ) : null}
          <button
            type="button"
            className="flex items-center justify-between border border-[var(--ink)] bg-[var(--paper)] px-5 py-4 font-editorial-sans text-base transition hover:bg-[var(--white)] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void copyInstallPrompt("skillfully", skillfullySkillInstallPrompt)}
          >
            {copiedInstallPrompt === "skillfully" ? "Copied" : "Install Skillfully Skill"}
            <CopyIcon />
          </button>
          {isPublished ? (
            <button
              type="button"
              className="flex items-center justify-between border border-[var(--ink)] bg-[var(--paper)] px-5 py-4 font-editorial-sans text-base transition hover:bg-[var(--white)]"
              onClick={() => void copyInstallPrompt("skill", userSkillInstallPrompt)}
            >
              {copiedInstallPrompt === "skill" ? "Copied" : `Install ${skill.name}`}
              <CopyIcon />
            </button>
          ) : null}
        </div>
      </header>

      <section className="grid md:grid-cols-3">
        <MetricCard label="Success rate" value={successRate} detail="Based on submitted feedback ratings." />
        <MetricCard label="Feedback received" value={feedbackReceived} detail="Total feedback entries collected for this skill." />
        <MetricCard
          label="Usage events"
          value={totalUsageEvents.toLocaleString()}
          detail={`${pluralCount(updateChecks, "update check")} / ${pluralCount(fileLoads, "file load")}.`}
        />
      </section>

      <UsageChart events={usageEvents} />

      <section className="grid">
        <SentimentPanel entries={entries} />
      </section>

      <RecentFeedbackTable entries={entries} />
      <PublishingStatus skill={skill} />
      <VersionSnapshot skill={skill} />
    </div>
  );
}
