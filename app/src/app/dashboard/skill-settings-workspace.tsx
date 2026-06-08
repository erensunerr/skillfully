"use client";

import { type ReactNode, useEffect, useState } from "react";
import { DropdownChevron } from "@/components/branded-select";
import { isUsingLocalPreviewDb } from "@/lib/db";
import { captureClientException } from "@/lib/client-analytics";
import type { AppUser, Skill, ThemeMode } from "./dashboard-model";
import { DASHBOARD_BUTTON, DASHBOARD_BUTTON_LIGHT, DASHBOARD_CARD, dashboardJson, displayAccountName, displayUserEmail, extractErrorMessage, skillInitials, skillSettingsPublishingRows, skillVisibility, slugifySkillName } from "./dashboard-model";
import { CopyIcon, DashboardIcon, StatusIcon, TargetIcon } from "./dashboard-icons";

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={`${DASHBOARD_CARD} overflow-hidden`}>
      <div className="border-b border-[var(--ink)] px-5 py-4 font-editorial-mono text-xs font-bold uppercase">
        {title}
      </div>
      {children}
    </section>
  );
}

function SettingsRow({
  label,
  value,
  action,
}: {
  label: string;
  value?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid gap-3 border-b border-[var(--ink)]/35 px-5 py-4 last:border-b-0 sm:grid-cols-[16rem_1fr_auto] sm:items-center">
      <span className="font-editorial-sans text-sm">{label}</span>
      <span className="min-w-0 font-editorial-sans text-sm">{value}</span>
      {action ? <span className="justify-self-start sm:justify-self-end">{action}</span> : null}
    </div>
  );
}

function TogglePill({ label = "Enabled" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--ink)] bg-[var(--paper)] px-3 py-1 font-editorial-sans text-xs">
      <span aria-hidden className="h-3 w-3 rounded-full bg-[var(--ink)]" />
      {label}
    </span>
  );
}

function AccountTopBar({
  user,
  isAccountMenuOpen,
  theme,
  onThemeChange,
  onToggleAccountMenu,
  onOpenAccountSettings,
  onSignOut,
}: {
  user: AppUser;
  isAccountMenuOpen: boolean;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onToggleAccountMenu: () => void;
  onOpenAccountSettings: () => void;
  onSignOut: () => void;
}) {
  const accountName = displayAccountName(user);
  const accountEmail = displayUserEmail(user);

  return (
    <div className="relative flex min-h-16 items-center justify-end gap-5 border-b border-[var(--ink)] bg-[var(--paper)] px-5">
      <button type="button" className="font-editorial-mono text-sm underline">
        Guide
      </button>
      <button
        type="button"
        aria-label="Theme"
        className="text-2xl leading-none"
        onClick={() => {
          const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
          onThemeChange(nextTheme);
        }}
      >
        ☼
      </button>
      <span aria-hidden className="h-9 border-l border-[var(--ink)]/40" />
      <button
        type="button"
        className="flex items-center gap-3"
        aria-haspopup="menu"
        aria-expanded={isAccountMenuOpen}
        onClick={onToggleAccountMenu}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ink)] font-editorial-mono text-sm font-bold text-[var(--paper)]">
          {skillInitials(accountName)}
        </span>
        <DropdownChevron open={isAccountMenuOpen} />
      </button>

      {isAccountMenuOpen ? (
        <div className="absolute right-5 top-[calc(100%+0.45rem)] z-30 w-64 border border-[var(--ink)] bg-[var(--white)] p-4 shadow-[6px_6px_0_var(--ink)]">
          <p className="font-editorial-mono text-sm">{accountEmail}</p>
          <div className="mt-4 border-t border-[var(--ink)] pt-3">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-2 py-3 text-left text-sm hover:bg-[var(--paper)]"
              onClick={onOpenAccountSettings}
            >
              <DashboardIcon name="account" />
              Account settings
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-2 py-3 text-left text-sm hover:bg-[var(--paper)]"
            >
              <StatusIcon name="check" />
              Product guide
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-2 py-3 text-left text-sm hover:bg-[var(--paper)]"
              onClick={onSignOut}
            >
              <StatusIcon name="x" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SkillSettingsWorkspace({
  skill,
  user,
  onSkillUpdated,
  onSkillDeleted,
}: {
  skill: Skill;
  user?: AppUser | null;
  onSkillUpdated?: (skill: Skill) => void;
  onSkillDeleted?: (skill: Skill) => void;
}) {
  const slug = slugifySkillName(skill.name);
  const isGitHubImported = skill.sourceMode === "github_import" && Boolean(skill.originalRepoFullName);
  const [currentVisibility, setCurrentVisibility] = useState<"private" | "public">(() => skillVisibility(skill));
  const [settingsStatus, setSettingsStatus] = useState("");
  const [isVisibilitySaving, setIsVisibilitySaving] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isDeletingSkill, setIsDeletingSkill] = useState(false);
  const sourceRepo = isGitHubImported ? skill.originalRepoFullName : "Skillfully storage";
  const sourcePath = isGitHubImported && skill.originalSkillPath
    ? skill.originalSkillPath
    : currentVisibility === "private"
      ? "Private manifest and files"
      : "Public manifest and files";
  const publishBehavior = currentVisibility === "private"
    ? skill.anyoneWithLinkCanUse === true
      ? "Publish private releases for anyone with the link"
      : "Publish private releases for shared users"
    : isGitHubImported
    ? "Create pull request on publish"
    : "Publish to Skillfully public manifest and files";

  useEffect(() => {
    setCurrentVisibility(skillVisibility(skill));
    setSettingsStatus("");
    setIsDeleteConfirming(false);
  }, [skill.id, skill.visibility]);

  async function updateVisibility(nextVisibility: "private" | "public") {
    if (nextVisibility === currentVisibility || isVisibilitySaving) {
      return;
    }

    setCurrentVisibility(nextVisibility);
    setIsVisibilitySaving(true);
    setSettingsStatus("Saving visibility...");
    try {
      if (!user || isUsingLocalPreviewDb) {
        const nextSkill = { ...skill, visibility: nextVisibility } as Skill;
        onSkillUpdated?.(nextSkill);
        setSettingsStatus("Visibility saved locally.");
        return;
      }
      const payload = await dashboardJson<{ skill: Skill }>(
        user,
        `/api/dashboard/skills/${skill.skillId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ visibility: nextVisibility }),
        },
      );
      setCurrentVisibility(skillVisibility(payload.skill));
      onSkillUpdated?.(payload.skill);
      setSettingsStatus("Visibility updated.");
    } catch (error) {
      captureClientException(error);
      setCurrentVisibility(skillVisibility(skill));
      setSettingsStatus(`Visibility update failed: ${extractErrorMessage(error)}`);
    } finally {
      setIsVisibilitySaving(false);
    }
  }

  async function deleteSkill() {
    if (!isDeleteConfirming) {
      setIsDeleteConfirming(true);
      setSettingsStatus("Click confirm delete to permanently delete this skill.");
      return;
    }

    setIsDeletingSkill(true);
    setSettingsStatus("Deleting skill...");
    try {
      if (!user || isUsingLocalPreviewDb) {
        onSkillDeleted?.(skill);
        return;
      }
      const payload = await dashboardJson<{ skill: Skill; deleted: boolean }>(
        user,
        `/api/dashboard/skills/${skill.skillId}`,
        { method: "DELETE" },
      );
      onSkillDeleted?.(payload.skill);
    } catch (error) {
      captureClientException(error);
      setSettingsStatus(`Delete failed: ${extractErrorMessage(error)}`);
    } finally {
      setIsDeletingSkill(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-5 py-8 sm:px-8 lg:px-11 lg:py-12">
      <header>
        <h1 className="font-editorial-sans text-5xl font-bold leading-none sm:text-6xl">
          Settings
        </h1>
        <p className="mt-3 text-lg leading-7">Persistent configuration for this skill.</p>
      </header>

      <SettingsSection title="01. General">
        <SettingsRow label="Skill name" value={skill.name} />
        <SettingsRow label="Slug" value={slug} />
        <SettingsRow
          label="Visibility"
          value={
            <div className="grid gap-3 sm:grid-cols-2">
              {(["private", "public"] as const).map((visibilityOption) => {
                const isSelected = currentVisibility === visibilityOption;
                return (
                  <button
                    key={visibilityOption}
                    type="button"
                    className={`flex items-center gap-3 border px-4 py-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60 ${
                      isSelected ? "border-[var(--ink)] bg-[var(--white)]" : "border-[var(--ink)]/45"
                    }`}
                    disabled={isVisibilitySaving}
                    onClick={() => void updateVisibility(visibilityOption)}
                  >
                    <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--ink)]">
                      {isSelected ? <span className="h-2 w-2 rounded-full bg-[var(--ink)]" /> : null}
                    </span>
                    <span className="capitalize">{visibilityOption}</span>
                  </button>
                );
              })}
            </div>
          }
        />
        {settingsStatus ? (
          <p className="border-b border-[var(--ink)]/35 px-5 py-4 font-editorial-mono text-xs font-bold uppercase">
            {settingsStatus}
          </p>
        ) : null}
      </SettingsSection>

      <SettingsSection title="02. Source">
        <div className="grid gap-3 border-b border-[var(--ink)]/35 p-5 sm:grid-cols-2">
          <button
            type="button"
            className={`flex items-center gap-3 border px-4 py-4 text-left text-sm ${
              isGitHubImported ? "border-[var(--ink)]/45" : "border-[var(--ink)] bg-[var(--white)]"
            }`}
          >
            <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--ink)]">
              {!isGitHubImported ? <span className="h-2 w-2 rounded-full bg-[var(--ink)]" /> : null}
            </span>
            Managed in Skillfully
          </button>
          <button
            type="button"
            className={`flex items-center gap-3 border px-4 py-4 text-left text-sm ${
              isGitHubImported ? "border-[var(--ink)] bg-[var(--white)]" : "border-[var(--ink)]/45"
            }`}
          >
            <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--ink)]">
              {isGitHubImported ? <span className="h-2 w-2 rounded-full bg-[var(--ink)]" /> : null}
            </span>
            Managed in GitHub
          </button>
        </div>
        <SettingsRow label="Repository" value={sourceRepo} />
        <SettingsRow label="Skill path" value={sourcePath} />
        <SettingsRow label="Default branch" value="Configured by publishing target" />
        <SettingsRow label="Publish behavior" value={publishBehavior} />
        <SettingsRow
          label="Connection status"
          value={<span className="inline-flex items-center gap-3"><span aria-hidden className="h-2 w-2 rounded-full bg-[var(--ink)]" />{isGitHubImported ? "Connected" : "Managed by Skillfully"}</span>}
        />
        {isGitHubImported ? (
          <div className="space-y-4 p-5">
            <button type="button" className={DASHBOARD_BUTTON_LIGHT}>Disconnect GitHub</button>
            <p className="text-sm leading-6 text-[var(--ink)]/65">
              Switching to "Managed in Skillfully" keeps Skillfully as the canonical source without GitHub tracking.
            </p>
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection title="03. Publishing">
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
            <thead className="font-editorial-mono text-xs uppercase">
              <tr className="border-b border-[var(--ink)]">
                <th className="py-3 font-bold">Destination</th>
                <th className="py-3 font-bold">Default behavior</th>
                <th className="py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {skillSettingsPublishingRows(isGitHubImported, currentVisibility).map(([destination, behavior, status, icon, dot]) => (
                <tr key={destination} className="border-b border-[var(--ink)]/50 last:border-b-0">
                  <td className="py-3">
                    <span className="flex items-center gap-3">
                      <TargetIcon name={icon} />
                      {destination}
                    </span>
                  </td>
                  <td className="py-3">{behavior}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-3">
                      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                      {status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm leading-6 text-[var(--ink)]/65">
            {currentVisibility === "private"
              ? skill.anyoneWithLinkCanUse === true
                ? "Private publishes are served by Skillfully only and are usable by anyone with the link."
                : "Private publishes are served by Skillfully only and are visible only to people with use or edit access."
              : isGitHubImported
              ? "GitHub is the source of truth for this skill; merge the publish PR before installing."
              : "Skillfully is the source of truth for this skill; GitHub is only used for imported skills."}
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title="04. Tracking">
        <SettingsRow label="Install tracking" action={<TogglePill />} />
        <SettingsRow label="Invocation tracking" action={<TogglePill />} />
        <SettingsRow label="Feedback collection" action={<TogglePill />} />
        <SettingsRow
          label="Manifest endpoint"
          value={<span className="font-editorial-mono">/api/skills/{skill.skillId}/manifest</span>}
          action={<button type="button" aria-label="Copy manifest endpoint" className="border border-[var(--ink)] p-3"><CopyIcon /></button>}
        />
        <SettingsRow
          label="Feedback endpoint"
          value={<span className="font-editorial-mono">/feedback/{skill.skillId}</span>}
          action={<button type="button" aria-label="Copy feedback endpoint" className="border border-[var(--ink)] p-3"><CopyIcon /></button>}
        />
        <p className="px-5 pb-5 text-sm text-[var(--ink)]/65">
          Invocations are counted when an agent submits feedback.
        </p>
      </SettingsSection>

      <SettingsSection title="05. Danger Zone">
        <SettingsRow
          label="Delete skill"
          value="Deletes drafts, published versions, sharing grants, usage events, and feedback for this skill."
          action={
            <button
              type="button"
              className={`${DASHBOARD_BUTTON_LIGHT} font-bold disabled:cursor-not-allowed disabled:opacity-60`}
              disabled={isDeletingSkill}
              onClick={() => void deleteSkill()}
            >
              {isDeletingSkill ? "Deleting..." : isDeleteConfirming ? "Confirm delete" : "Delete skill"}
            </button>
          }
        />
      </SettingsSection>
    </div>
  );
}

export function AccountSettingsWorkspace({
  user,
  isAccountMenuOpen,
  theme = "system",
  onThemeChange = () => undefined,
  onToggleAccountMenu,
  onOpenAccountSettings,
  onSignOut,
}: {
  user: AppUser;
  isAccountMenuOpen: boolean;
  theme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
  onToggleAccountMenu: () => void;
  onOpenAccountSettings: () => void;
  onSignOut: () => void;
}) {
  const accountName = displayAccountName(user);
  const accountEmail = displayUserEmail(user);

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <AccountTopBar
        user={user}
        isAccountMenuOpen={isAccountMenuOpen}
        theme={theme}
        onThemeChange={onThemeChange}
        onToggleAccountMenu={onToggleAccountMenu}
        onOpenAccountSettings={onOpenAccountSettings}
        onSignOut={onSignOut}
      />

      <section className="mx-auto w-full max-w-7xl space-y-7 px-5 py-8 sm:px-8 lg:px-11">
        <header>
          <h1 className="font-editorial-sans text-5xl font-bold leading-none sm:text-6xl">
            Account Settings
          </h1>
          <p className="mt-3 text-lg leading-7">Manage your profile, preferences, and data.</p>
        </header>

        <section className="grid gap-6 border-t border-[var(--ink)] pt-6 lg:grid-cols-[16rem_1fr]">
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase">Profile</p>
            <p className="mt-3 text-sm leading-6">
              Update your personal information and how your name appears.
            </p>
          </div>
          <div className={DASHBOARD_CARD}>
            <SettingsRow label="Name" value={accountName} action={<button type="button" className={DASHBOARD_BUTTON}>Edit</button>} />
            <SettingsRow label="Email" value={accountEmail} action={<button type="button" className={DASHBOARD_BUTTON}>Edit</button>} />
            <SettingsRow
              label="Avatar"
              value={<span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ink)] font-editorial-mono text-sm font-bold text-[var(--paper)]">{skillInitials(accountName)}</span>}
              action={<button type="button" className={DASHBOARD_BUTTON_LIGHT}>Change</button>}
            />
          </div>
        </section>

        <section className="grid gap-6 border-t border-[var(--ink)] pt-6 lg:grid-cols-[16rem_1fr]">
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase">Preferences</p>
            <p className="mt-3 text-sm leading-6">
              Customize your default experience across Skillfully.
            </p>
          </div>
          <div className={DASHBOARD_CARD}>
            <SettingsRow
              label="Theme"
              action={
                <span className="inline-grid grid-cols-3 border border-[var(--ink)]">
                  {(["light", "dark", "system"] as const).map((mode) => {
                    const isActive = theme === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        className={`px-6 py-2 text-sm capitalize ${
                          isActive ? "bg-[var(--ink)] text-[var(--paper)]" : ""
                        }`}
                        onClick={() => onThemeChange(mode)}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    );
                  })}
                </span>
              }
            />
            <SettingsRow label="Default landing page" value="Dashboard" action={<DropdownChevron />} />
            <SettingsRow label="Time zone" value="Browser default" action={<DropdownChevron />} />
            <SettingsRow
              label="Email notifications"
              value="Important updates about your skills"
              action={<TogglePill label="" />}
            />
          </div>
        </section>

        <section className="grid gap-6 border-t border-[var(--ink)] pt-6 lg:grid-cols-[16rem_1fr]">
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase">Security</p>
            <p className="mt-3 text-sm leading-6">Keep your account secure.</p>
          </div>
          <div className={DASHBOARD_CARD}>
            <SettingsRow label="Sign-in method" value="Email magic code" />
            <SettingsRow label="Active sessions" value="Current session" action={<button type="button" className={DASHBOARD_BUTTON_LIGHT}>View Sessions</button>} />
          </div>
        </section>

        <section className="grid gap-6 border-t border-[var(--ink)] pt-6 lg:grid-cols-[16rem_1fr]">
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase">Data & Privacy</p>
            <p className="mt-3 text-sm leading-6">Manage your data and privacy settings.</p>
          </div>
          <div className={DASHBOARD_CARD}>
            <SettingsRow
              label="Export your data"
              value="Download a copy of your skills and analytics."
              action={<button type="button" className={DASHBOARD_BUTTON_LIGHT}>Export</button>}
            />
            <SettingsRow
              label="Delete account"
              value="Permanently delete your account and all data."
              action={<button type="button" className={DASHBOARD_BUTTON_LIGHT}>Delete</button>}
            />
          </div>
        </section>

        <p className="pt-3 font-editorial-mono text-sm">
          Questions? Contact us at <a href="mailto:hello@skillfully.dev" className="underline">hello@skillfully.dev</a>
        </p>
      </section>
    </div>
  );
}
