"use client";

import { type FormEvent, useEffect, useState } from "react";
import { BrandedCheckbox } from "@/components/branded-checkbox";
import { BrandedSelect } from "@/components/branded-select";
import { isUsingLocalPreviewDb } from "@/lib/db";
import { captureClientException } from "@/lib/client-analytics";
import type { AppUser, Skill, SkillAccessGrantView } from "./dashboard-model";
import { DASHBOARD_BUTTON, DASHBOARD_INPUT, dashboardJson, extractErrorMessage, isValidEmail, normalizePermission, permissionSelectOptions, skillVisibility } from "./dashboard-model";

export function SkillShareDialog({
  skill,
  user,
  onSkillUpdated,
  onClose,
}: {
  skill: Skill;
  user?: AppUser | null;
  onSkillUpdated?: (skill: Skill) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"use" | "edit">("use");
  const [grants, setGrants] = useState<SkillAccessGrantView[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [anyoneWithLinkCanUse, setAnyoneWithLinkCanUse] = useState(() => Boolean(skill.anyoneWithLinkCanUse));
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinkUseSaving, setIsLinkUseSaving] = useState(false);
  const isPrivateSkill = skillVisibility(skill) === "private";

  async function loadGrants() {
    if (!user || isUsingLocalPreviewDb) {
      setGrants([]);
      setStatusMessage(isUsingLocalPreviewDb ? "Sharing requires a connected Skillfully account." : "");
      return;
    }

    setIsLoading(true);
    setStatusMessage("");
    try {
      const payload = await dashboardJson<{ grants: SkillAccessGrantView[] }>(
        user,
        `/api/dashboard/skills/${skill.skillId}/access`,
        { method: "GET" },
      );
      setGrants(payload.grants);
    } catch (error) {
      captureClientException(error);
      setStatusMessage(extractErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadGrants();
  }, [skill.skillId, user?.id, user?.refresh_token]);

  useEffect(() => {
    if (!isLinkUseSaving) {
      setAnyoneWithLinkCanUse(Boolean(skill.anyoneWithLinkCanUse));
    }
  }, [skill.id, skill.anyoneWithLinkCanUse, isLinkUseSaving]);

  async function updateLinkUse(nextValue: boolean) {
    if (!isPrivateSkill || isLinkUseSaving) {
      return;
    }

    const previousValue = anyoneWithLinkCanUse;
    setAnyoneWithLinkCanUse(nextValue);
    setIsLinkUseSaving(true);
    setStatusMessage("Saving link access...");
    try {
      if (!user || isUsingLocalPreviewDb) {
        const nextSkill = { ...skill, anyoneWithLinkCanUse: nextValue } as Skill;
        onSkillUpdated?.(nextSkill);
        setStatusMessage("Link access saved locally.");
        return;
      }
      const payload = await dashboardJson<{ skill: Skill }>(
        user,
        `/api/dashboard/skills/${skill.skillId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ anyoneWithLinkCanUse: nextValue }),
        },
      );
      setAnyoneWithLinkCanUse(Boolean(payload.skill.anyoneWithLinkCanUse));
      onSkillUpdated?.(payload.skill);
      setStatusMessage("Link access updated.");
    } catch (error) {
      captureClientException(error);
      setAnyoneWithLinkCanUse(previousValue);
      setStatusMessage(`Link access update failed: ${extractErrorMessage(error)}`);
    } finally {
      setIsLinkUseSaving(false);
    }
  }

  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    if (!user || isUsingLocalPreviewDb) {
      setStatusMessage("Sharing requires a connected Skillfully account.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setStatusMessage("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");
    try {
      const payload = await dashboardJson<{
        grant: SkillAccessGrantView;
        notification: { status: "sent" | "failed"; error?: string | null };
      }>(user, `/api/dashboard/skills/${skill.skillId}/access`, {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
          permission,
        }),
      });
      setEmail("");
      setGrants((current) => [
        payload.grant,
        ...current.filter((grant) => grant.id !== payload.grant.id),
      ]);
      setStatusMessage(
        payload.notification.status === "sent"
          ? "Access granted. Email sent."
          : `Access granted. Email failed${payload.notification.error ? `: ${payload.notification.error}` : "."}`,
      );
    } catch (error) {
      captureClientException(error);
      setStatusMessage(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateGrantPermission(grant: SkillAccessGrantView, nextPermission: "use" | "edit") {
    if (!user || grant.is_owner) {
      return;
    }
    setStatusMessage("");
    try {
      const payload = await dashboardJson<{ grant: SkillAccessGrantView }>(
        user,
        `/api/dashboard/skills/${skill.skillId}/access/${grant.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ permission: nextPermission }),
        },
      );
      setGrants((current) => current.map((entry) => entry.id === grant.id ? payload.grant : entry));
    } catch (error) {
      captureClientException(error);
      setStatusMessage(extractErrorMessage(error));
    }
  }

  async function revokeGrant(grant: SkillAccessGrantView) {
    if (!user || !grant.can_revoke) {
      return;
    }
    setStatusMessage("");
    try {
      await dashboardJson<{ grant: SkillAccessGrantView }>(
        user,
        `/api/dashboard/skills/${skill.skillId}/access/${grant.id}`,
        { method: "DELETE" },
      );
      setGrants((current) => current.filter((entry) => entry.id !== grant.id));
    } catch (error) {
      captureClientException(error);
      setStatusMessage(extractErrorMessage(error));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/35 px-5 py-8 backdrop-blur-[1px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-skill-title"
        className="w-full max-w-2xl border-2 border-[var(--ink)] bg-[var(--white)] p-6 shadow-[8px_8px_0_var(--ink)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase">Share</p>
            <h2 id="share-skill-title" className="mt-3 font-editorial-sans text-3xl font-bold">
              {skill.name}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close share dialog"
            className="border border-[var(--ink)] px-3 py-1 font-editorial-mono text-lg"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form className="mt-7 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto]" onSubmit={(event) => void submitInvite(event)}>
          <label className="block font-editorial-mono text-xs font-bold uppercase">
            Email
            <input
              type="email"
              className={DASHBOARD_INPUT}
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              placeholder="teammate@example.com"
              required
            />
          </label>
          <label className="block font-editorial-mono text-xs font-bold uppercase">
            Permission
            <BrandedSelect
              ariaLabel="Share permission"
              className="mt-2 w-full"
              value={permission}
              options={permissionSelectOptions}
              onChange={(nextValue) => setPermission(normalizePermission(nextValue))}
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className={`${DASHBOARD_BUTTON} w-full`} disabled={isSubmitting}>
              {isSubmitting ? "Sharing..." : "Share"}
            </button>
          </div>
        </form>

        {isPrivateSkill ? (
          <div className="mt-5 border border-[var(--ink)] bg-[var(--paper)] px-4 py-3">
            <BrandedCheckbox
              checked={anyoneWithLinkCanUse}
              disabled={isLinkUseSaving}
              onChange={(event) => void updateLinkUse(event.currentTarget.checked)}
            >
              Anyone with link can use.
            </BrandedCheckbox>
            <p className="mt-2 text-sm leading-5 text-[var(--ink)]/65">
              Disable link access to revoke the current link.
            </p>
          </div>
        ) : null}

        <div className="mt-7 border border-[var(--ink)]">
          <div className="border-b border-[var(--ink)] px-4 py-3 font-editorial-mono text-xs font-bold uppercase">
            People with access
          </div>
          {isLoading ? (
            <p className="px-4 py-5 font-editorial-mono text-xs uppercase">Loading access...</p>
          ) : grants.length === 0 ? (
            <p className="px-4 py-5 text-sm text-[var(--ink)]/65">No collaborators yet.</p>
          ) : (
            <div className="divide-y divide-[var(--ink)]/25">
              {grants.map((grant) => (
                <div key={grant.id} className="grid gap-3 px-4 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-editorial-sans">{grant.email || grant.user_id || "Owner"}</p>
                    <p className="mt-1 font-editorial-mono text-[0.68rem] uppercase text-[var(--ink)]/60">
                      {grant.is_owner ? "Owner" : "Collaborator"}
                    </p>
                  </div>
                  <BrandedSelect
                    ariaLabel={`${grant.email || grant.user_id || "Owner"} permission`}
                    className="sm:w-32"
                    value={grant.permission}
                    disabled={grant.is_owner}
                    options={permissionSelectOptions}
                    size="compact"
                    onChange={(nextValue) => void updateGrantPermission(grant, normalizePermission(nextValue))}
                  />
                  <button
                    type="button"
                    className="border border-[var(--ink)] px-3 py-2 font-editorial-mono text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!grant.can_revoke}
                    onClick={() => void revokeGrant(grant)}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {statusMessage ? (
          <p className="mt-5 border border-[var(--ink)] bg-[var(--paper)] p-3 font-editorial-mono text-xs font-bold uppercase">
            {statusMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
}
