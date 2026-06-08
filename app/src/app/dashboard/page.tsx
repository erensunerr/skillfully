"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_SKILL_DESCRIPTION } from "@/lib/skills/skill-frontmatter";
import { captureClientEvent, captureClientException, identifyClientUser, resetClientAnalytics } from "@/lib/client-analytics";
import { db, isUsingLocalPreviewDb } from "@/lib/db";
import { id } from "@instantdb/react";
import {
  githubConnectionStatusMessage,
  resolveDashboardTabForSkill,
  resolveDashboardViewState,
  shouldShowOnboardingModalByDefault,
} from "./view-state";
import { ActivationWorkspace } from "./activation-workspace";
import {
  GitHubImportModal,
  type GitHubImportCandidateView,
  type GitHubImportModalState,
} from "./github-import-modal";
import { AuthForm, CreateSkillModal, EmptyState, SkillForm } from "./dashboard-forms";
import { DashboardSidebar } from "./dashboard-sidebar";
import { AccountSettingsWorkspace } from "./skill-settings-workspace";
import { SkillDetail } from "./skill-detail";
import {
  type ActivationForm,
  type ActivationMode,
  type AuthForm as AuthFormState,
  type AuthPhase,
  type DashboardRouteProps,
  type DashboardTab,
  type Feedback,
  type GitHubImportCandidatesResponse,
  type GitHubImportSubmitResponse,
  type GitHubInstallStartResponse,
  type Screen,
  type Skill,
  type SkillForm as SkillFormState,
  type SkillRouteTab,
  type SkillUsageEvent,
  type ThemeMode,
  activationSummary,
  applyGitHubImportFailuresToCandidates,
  buildActivationBody,
  dashboardAuthHeaders,
  dashboardJson,
  extractErrorMessage,
  gettingStartedRoute,
  isSkillRouteTab,
  isValidEmail,
  pushDashboardPath,
  randomSkillId,
  skillRoute,
} from "./dashboard-model";

export { AuthForm, CreateSkillModal, EmptyState, SkillForm } from "./dashboard-forms";
export { DashboardSidebar, SkillSelector } from "./dashboard-sidebar";
export { PublishSkillModal } from "./publish-skill-modal";
export { SkillShareDialog } from "./skill-share-dialog";
export { AccountSettingsWorkspace, SkillSettingsWorkspace } from "./skill-settings-workspace";
export { SkillDetail } from "./skill-detail";
export { analyticsRowsFromUsageEvents, SkillAnalyticsWorkspace } from "./skill-analytics-workspace";
export { hasInstallationConfirmation, isEditableSkillFile, applyGitHubImportFailuresToCandidates } from "./dashboard-model";
function useOptionalRouter() {
  try {
    return useRouter();
  } catch {
    return {
      push: () => undefined,
    };
  }
}

export default function Dashboard({
  initialSkillId,
  initialTab = "overview",
  routeName = "index",
}: DashboardRouteProps = {}) {
  const router = useOptionalRouter();
  const { isLoading: isAuthLoading, user, error: authHookError } = db.useAuth();
  const [screen, setScreen] = useState<Screen>("list");
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [isSkillSelectorOpen, setIsSkillSelectorOpen] = useState(false);
  const [isCreateSkillModalOpen, setIsCreateSkillModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const [authPhase, setAuthPhase] = useState<AuthPhase>("request");
  const [authForm, setAuthForm] = useState<AuthFormState>({ email: "", code: "" });
  const [pendingEmail, setPendingEmail] = useState("");
  const [hasTrackedCodeEntry, setHasTrackedCodeEntry] = useState(false);

  const [skillForm, setSkillForm] = useState<SkillFormState>({
    name: "",
    description: "",
  });
  const [modalSkillForm, setModalSkillForm] = useState<SkillFormState>({
    name: "",
    description: "",
  });
  const [activationMode, setActivationMode] = useState<ActivationMode | null>(null);
  const [activationForm, setActivationForm] = useState<ActivationForm>({
    name: "",
    audience: "",
    job: "",
    examplePrompt: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [githubImportSessionId, setGitHubImportSessionId] = useState<string | null>(null);
  const [githubImportState, setGitHubImportState] = useState<GitHubImportModalState>("loading");
  const [githubImportCandidates, setGitHubImportCandidates] = useState<GitHubImportCandidateView[]>([]);
  const [githubImportWarnings, setGitHubImportWarnings] = useState<string[]>([]);
  const [githubConnectedRepositories, setGitHubConnectedRepositories] = useState<string[]>([]);
  const [selectedGitHubImportIds, setSelectedGitHubImportIds] = useState<Set<string>>(new Set());
  const [isGitHubImporting, setIsGitHubImporting] = useState(false);
  const [githubImportError, setGitHubImportError] = useState("");
  const [visibleSkillsFromApi, setVisibleSkillsFromApi] = useState<Skill[] | null>(null);

  const query = useMemo(() => {
    if (!user) {
      return null;
    }

    return {
      skills: {
        $: {
          where: {
            ownerId: user.id,
          },
          order: {
            createdAt: "desc",
          },
        },
      },
      feedback: {
        $: {
          where: {
            ownerId: user.id,
          },
          order: {
            createdAt: "desc",
          },
        },
      },
      skillUsageEvents: {
        $: {
          where: {
            ownerId: user.id,
          },
          order: {
            createdAt: "desc",
          },
        },
      },
    } as const;
  }, [user?.id]);

  const { isLoading: isDataLoading, error: dataError, data } = db.useQuery(query);

  const ownedSkills = (data?.skills ?? []) as Skill[];
  const skills = visibleSkillsFromApi ?? ownedSkills;
  const feedback = (data?.feedback ?? []) as Feedback[];
  const usageEvents = (data?.skillUsageEvents ?? []) as SkillUsageEvent[];

  const viewState = resolveDashboardViewState({
    screen,
    skills,
    selectedSkillId,
  });

  const selectedSkill =
    viewState.kind === "detail"
      ? skills.find((skill) => skill.id === viewState.skillId) ?? null
      : null;

  const selectedFeedback = useMemo(
    () =>
      selectedSkill
        ? feedback.filter((entry) => entry.skillId === selectedSkill.skillId)
        : [],
    [selectedSkill, feedback],
  );
  const selectedUsageEvents = useMemo(
    () =>
      selectedSkill
        ? usageEvents.filter((entry) => entry.skillId === selectedSkill.skillId)
        : [],
    [selectedSkill, usageEvents],
  );

  useEffect(() => {
    if (!user || activeTab !== "analytics") {
      return;
    }

    captureClientEvent("analytics_viewed", {
      surface: "dashboard",
      skill_id: selectedSkill?.skillId ?? null,
      skill_name: selectedSkill?.name ?? null,
    });
  }, [activeTab, selectedSkill?.skillId, selectedSkill?.name, user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function syncStateFromLocation() {
      const segments = window.location.pathname.split("/").filter(Boolean);
      if (segments[0] !== "dashboard") {
        return;
      }

      if (segments[1] === "settings") {
        setActiveTab("account");
        setSelectedSkillId(null);
        setScreen("list");
        return;
      }

      if (!segments[1]) {
        setActiveTab("overview");
        setSelectedSkillId(null);
        setScreen("list");
        return;
      }

      const routeSkillId = decodeURIComponent(segments[1]);
      const routeSkill = skills.find((skill) => skill.id === routeSkillId || skill.skillId === routeSkillId);
      if (!routeSkill) {
        return;
      }

      setActiveTab(isSkillRouteTab(segments[2]) ? segments[2] : "overview");
      setSelectedSkillId(routeSkill.id);
      setScreen("detail");
    }

    window.addEventListener("popstate", syncStateFromLocation);
    return () => window.removeEventListener("popstate", syncStateFromLocation);
  }, [skills]);

  const isGettingStartedRoute = routeName === "getting-started";
  const shouldShowActivationWorkspace = isGettingStartedRoute && screen === "list" && skills.length === 0;
  const shouldShowOnboardingModal =
    !isGettingStartedRoute &&
    screen === "list" &&
    !githubImportSessionId &&
    !onboardingDismissed &&
    shouldShowOnboardingModalByDefault({ skills });

  useEffect(() => {
    if (!user || skills.length > 0 || githubImportSessionId) {
      return;
    }

    if (isGettingStartedRoute || initialTab === "account") {
      return;
    }

    pushDashboardPath(router, gettingStartedRoute());
  }, [githubImportSessionId, initialTab, isGettingStartedRoute, router, skills.length, user]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "system" ? "light dark" : theme;
  }, [theme]);

  useEffect(() => {
    setOnboardingDismissed(false);
    setVisibleSkillsFromApi(null);
    setActivationMode(null);
    setActivationForm({
      name: "",
      audience: "",
      job: "",
      examplePrompt: "",
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user || isUsingLocalPreviewDb) {
      return;
    }

    let active = true;
    dashboardJson<{ skills: Skill[] }>(user, "/api/dashboard/skills", { method: "GET" })
      .then((payload) => {
        if (active) {
          setVisibleSkillsFromApi(payload.skills);
        }
      })
      .catch((error) => {
        if (active) {
          captureClientException(error);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id, user?.refresh_token]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (initialTab === "account") {
      setActiveTab("account");
      setScreen("list");
      setOnboardingDismissed(true);
      return;
    }

    if (!initialSkillId || skills.length === 0) {
      return;
    }

    const routedSkill =
      skills.find((skill) => skill.id === initialSkillId || skill.skillId === initialSkillId) ?? null;

    if (!routedSkill) {
      return;
    }

    setSelectedSkillId(routedSkill.id);
    setActiveTab(isSkillRouteTab(initialTab) ? resolveDashboardTabForSkill(routedSkill, initialTab) : "overview");
    setScreen("detail");
    setOnboardingDismissed(true);
  }, [initialSkillId, initialTab, skills, user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("github_import");
    const statusMessage = githubConnectionStatusMessage({
      status: params.get("github"),
      hasImportSession: Boolean(sessionId),
    });
    if (statusMessage) {
      setOnboardingDismissed(true);
      setErrorMessage(statusMessage);
    }

    if (!user) {
      return;
    }

    if (!sessionId) {
      return;
    }
    if (window.sessionStorage.getItem(`skillfully.github_import.dismissed.${sessionId}`)) {
      const url = new URL(window.location.href);
      url.searchParams.delete("github_import");
      url.searchParams.delete("github");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
      return;
    }

    setOnboardingDismissed(true);
    setGitHubImportSessionId(sessionId);
  }, [user?.id]);

  useEffect(() => {
    if (!user || !githubImportSessionId) {
      return;
    }

    let active = true;
    setGitHubImportState("loading");
    setGitHubImportError("");
    setGitHubImportCandidates([]);
    setGitHubImportWarnings([]);
    setGitHubConnectedRepositories([]);
    setSelectedGitHubImportIds(new Set());

    dashboardJson<GitHubImportCandidatesResponse>(
      user,
      `/api/dashboard/github/import?session_id=${encodeURIComponent(githubImportSessionId)}`,
      { method: "GET" },
    )
      .then((payload) => {
        if (!active) {
          return;
        }
        setGitHubImportCandidates(payload.candidates ?? []);
        setGitHubImportWarnings(payload.warnings ?? []);
        setGitHubConnectedRepositories(payload.repositories ?? []);
        setGitHubImportState((payload.candidates ?? []).length > 0 ? "ready" : "empty");
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        captureClientException(error);
        setGitHubImportError(extractErrorMessage(error));
        setGitHubImportState("error");
      });

    return () => {
      active = false;
    };
  }, [githubImportSessionId, user?.id]);

  if (isAuthLoading || (user && isDataLoading)) {
    return <main className="min-h-screen overflow-x-hidden border-x border-[var(--ink)] bg-[var(--paper)]" />;
  }

  if (authHookError) {
    return (
      <main className="min-h-screen overflow-x-hidden border-x border-[var(--ink)] bg-[var(--paper)] p-6 text-red-700">
        Sign-in failed: {authHookError.message}
      </main>
    );
  }

  if (!user) {
    const currentMessage = errorMessage;

    return (
      <AuthForm
        phase={authPhase}
        form={authForm}
        email={pendingEmail || authForm.email}
        disabled={isSubmitting}
        message={currentMessage}
        onEmailSubmit={async () => {
          setErrorMessage("");
          const normalized = authForm.email.trim().toLowerCase();

          if (!isValidEmail(normalized)) {
            setErrorMessage("Please enter a valid email");
            return;
          }

          captureClientEvent("auth_email_submitted", { auth_flow: "dashboard" });
          setIsSubmitting(true);
          try {
            await db.auth.sendMagicCode({ email: normalized });
            setPendingEmail(normalized);
            setAuthForm((state) => ({ ...state, email: normalized, code: "" }));
            setHasTrackedCodeEntry(false);
            setAuthPhase("verify");
          } catch (error) {
            captureClientException(error);
            setErrorMessage(extractErrorMessage(error));
          } finally {
            setIsSubmitting(false);
          }
        }}
        onVerifySubmit={async () => {
          setErrorMessage("");

          const normalized = pendingEmail || authForm.email.trim().toLowerCase();
          const code = authForm.code.trim();

          if (!isValidEmail(normalized)) {
            setAuthPhase("request");
            setErrorMessage("Please enter your email first");
            return;
          }

          if (!code) {
            setErrorMessage("Please enter the verification code");
            return;
          }

          captureClientEvent("auth_code_submitted", {
            auth_flow: "dashboard",
            code_length: code.length,
          });
          setIsSubmitting(true);
          try {
            const response = await db.auth.signInWithMagicCode({
              email: normalized,
              code,
            });

            if (response.user) {
              identifyClientUser(response.user.id, { email: normalized });
              captureClientEvent("auth_code_verified", { auth_flow: "dashboard" });
              return;
            }

            setErrorMessage("Could not verify code yet. Try again.");
          } catch (error) {
            captureClientException(error);
            setErrorMessage(extractErrorMessage(error));
          } finally {
            setIsSubmitting(false);
          }
        }}
        onEmailChange={(value) => {
          setErrorMessage("");
          setAuthForm((state) => ({ ...state, email: value }));
        }}
        onCodeChange={(value) => {
          setErrorMessage("");
          if (!hasTrackedCodeEntry && value.trim()) {
            captureClientEvent("auth_code_entered", {
              auth_flow: "dashboard",
              code_length: value.trim().length,
            });
            setHasTrackedCodeEntry(true);
          }
          setAuthForm((state) => ({ ...state, code: value }));
        }}
        onCodePaste={() => {
          captureClientEvent("auth_code_pasted", { auth_flow: "dashboard" });
        }}
        onChangeMode={() => {
          setErrorMessage("");
          setAuthPhase("request");
          setAuthForm((state) => ({ ...state, code: "" }));
          setHasTrackedCodeEntry(false);
        }}
      />
    );
  }

  if (dataError) {
    return (
      <main className="min-h-screen overflow-x-hidden border-x border-[var(--ink)] bg-[var(--paper)] p-6 text-red-700">
        Data load failed: {dataError.message}
      </main>
    );
  }

  async function handleSignOut() {
    captureClientEvent("user_signed_out");
    resetClientAnalytics();
    setErrorMessage("");
    setSkillForm({ name: "", description: "" });
    setAuthForm({ email: "", code: "" });
    setAuthPhase("request");
    setHasTrackedCodeEntry(false);
    setSelectedSkillId(null);
    setActiveTab("overview");
    setIsSkillSelectorOpen(false);
    setIsCreateSkillModalOpen(false);
    setIsAccountMenuOpen(false);
    setOnboardingDismissed(false);
    setScreen("list");

    await db.auth.signOut({ invalidateToken: true });
  }

  function openCreateSkill() {
    setOnboardingDismissed(true);
    setErrorMessage("");
    setIsSkillSelectorOpen(false);
    setIsAccountMenuOpen(false);
    setActiveTab("editor");
    setScreen("create");
  }

  function openCreateSkillModal() {
    setOnboardingDismissed(true);
    setErrorMessage("");
    setModalSkillForm({ name: "", description: "" });
    setIsSkillSelectorOpen(false);
    setIsAccountMenuOpen(false);
    setIsCreateSkillModalOpen(true);
  }

  function openOnboarding() {
    setOnboardingDismissed(true);
    setErrorMessage("");
    setIsSkillSelectorOpen(false);
    setIsAccountMenuOpen(false);
    setActiveTab("overview");
    setScreen("list");
    setActivationMode("template");
    pushDashboardPath(router, gettingStartedRoute());
  }

  async function openGitHubInstall(surface: string, intent: "import" | "configure" = "import") {
    if (!user) {
      setErrorMessage("Sign in before connecting GitHub.");
      return;
    }

    setErrorMessage("");
    setGitHubImportError("");
    captureClientEvent("github_install_started", { surface });

    try {
      const payload = await dashboardJson<GitHubInstallStartResponse>(user, "/api/github/install", {
        method: "POST",
        body: JSON.stringify({ intent }),
      });
      // Existing installations stay inside Skillfully: the API returns a new
      // import session id instead of a GitHub URL.
      if (payload.session_id) {
        setOnboardingDismissed(true);
        setIsCreateSkillModalOpen(false);
        setGitHubImportSessionId(payload.session_id);
        return;
      }
      if (!payload.install_url) {
        throw new Error("GitHub install URL was not returned.");
      }
      window.location.href = payload.install_url;
    } catch (error) {
      captureClientException(error);
      const message = extractErrorMessage(error);
      setErrorMessage(message);
      setGitHubImportError(message);
    }
  }

  function clearGitHubImportUrl() {
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("github_import");
    url.searchParams.delete("github");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  function closeGitHubImportModal() {
    if (githubImportSessionId && typeof window !== "undefined") {
      window.sessionStorage.setItem(`skillfully.github_import.dismissed.${githubImportSessionId}`, "true");
    }
    setGitHubImportSessionId(null);
    setGitHubImportCandidates([]);
    setGitHubImportWarnings([]);
    setGitHubConnectedRepositories([]);
    setSelectedGitHubImportIds(new Set());
    setGitHubImportError("");
    setIsGitHubImporting(false);
    clearGitHubImportUrl();
  }

  function toggleGitHubImportCandidate(candidateId: string) {
    setSelectedGitHubImportIds((current) => {
      const next = new Set(current);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  }

  async function importSelectedGitHubSkills() {
    if (!user || !githubImportSessionId || selectedGitHubImportIds.size === 0) {
      return;
    }

    setIsGitHubImporting(true);
    setGitHubImportError("");
    try {
      const headers = new Headers(dashboardAuthHeaders(user, "application/json"));
      const response = await fetch("/api/dashboard/github/import", {
        method: "POST",
        headers,
        body: JSON.stringify({
          session_id: githubImportSessionId,
          candidate_ids: Array.from(selectedGitHubImportIds),
        }),
      });
      const payload = (await response.json()) as GitHubImportSubmitResponse;

      if (payload.failures?.length) {
        const result = applyGitHubImportFailuresToCandidates({
          candidates: payload.candidates ?? githubImportCandidates,
          selectedCandidateIds: selectedGitHubImportIds,
          failures: payload.failures,
        });
        setGitHubImportCandidates(result.candidates);
        setSelectedGitHubImportIds(result.selectedCandidateIds);
        setGitHubImportState(result.candidates.length > 0 ? "ready" : "empty");
        setGitHubImportError("");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error || `Request failed: ${response.status}`);
      }

      const firstImported = payload.imported[0];
      if (!firstImported) {
        setGitHubImportError("No skills were imported.");
        return;
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(`skillfully.github_import.dismissed.${githubImportSessionId}`, "true");
      }
      setGitHubImportSessionId(null);
      setSelectedGitHubImportIds(new Set());
      setGitHubConnectedRepositories([]);
      setOnboardingDismissed(true);
      clearGitHubImportUrl();
      router.push(`/dashboard/${firstImported.skill_id}/overview`);
    } catch (error) {
      captureClientException(error);
      setGitHubImportError(extractErrorMessage(error));
    } finally {
      setIsGitHubImporting(false);
    }
  }

  function openDashboardTab(tab: DashboardTab) {
    captureClientEvent("dashboard_tab_selected", { tab });
    setOnboardingDismissed(true);
    setErrorMessage("");
    setIsSkillSelectorOpen(false);
    setIsAccountMenuOpen(false);

    if (tab === "account") {
      setActiveTab("account");
      setScreen("list");
      pushDashboardPath(router, "/dashboard/settings");
      return;
    }

    if (skills.length === 0) {
      if (tab === "editor") {
        setActiveTab("editor");
        setScreen("create");
        return;
      }

      setActiveTab(tab);
      setScreen("list");
      return;
    }

    const routeSkill =
      skills.find((skill) => skill.id === selectedSkillId) ?? selectedSkill ?? skills[0];
    const nextTab = isSkillRouteTab(tab)
      ? resolveDashboardTabForSkill(routeSkill, tab)
      : "overview";

    if (!selectedSkillId) {
      setSelectedSkillId(routeSkill.id);
    }

    setActiveTab(nextTab);

    if (isSkillRouteTab(nextTab)) {
      pushDashboardPath(router, skillRoute(routeSkill, nextTab));
    }
    setScreen("detail");
  }

  async function createSkill({
    name,
    description,
    body,
    activationSource = "manual",
    destinationTab = "overview",
  }: {
    name: string;
    description: string;
    body?: string;
    activationSource?: string;
    destinationTab?: "overview" | "editor";
  }) {
    if (!user) {
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage("Skill name is required");
      return;
    }

    const cleanDescription = description.trim() || undefined;
    const cleanBody = body?.trim() || undefined;
    setIsSubmitting(true);

    try {
      let createdSkillId: string;
      let createdEntityId: string;

      if (isUsingLocalPreviewDb) {
        const newSkillEntityId = id();
        const newSkillId = randomSkillId();
        db.transact(
          db.tx.skills[newSkillEntityId].create({
            ownerId: user.id,
            name: cleanName,
            description: cleanDescription,
            skillId: newSkillId,
            createdAt: Date.now(),
          }),
        );
        createdSkillId = newSkillId;
        createdEntityId = newSkillEntityId;
      } else {
        const response = await dashboardJson<{ skill: Skill }>(user, "/api/dashboard/skills", {
          method: "POST",
          body: JSON.stringify({
            name: cleanName,
            description: cleanDescription,
            body: cleanBody,
            activation_source: activationSource,
          }),
        });
        createdSkillId = response.skill.skillId;
        createdEntityId = response.skill.id;
        setVisibleSkillsFromApi((current) =>
          current
            ? [{ ...response.skill, accessLevel: "owner" }, ...current]
            : current,
        );
      }

      setSkillForm({ name: "", description: "" });
      setModalSkillForm({ name: "", description: "" });
      setActivationMode(null);
      setActivationForm({
        name: "",
        audience: "",
        job: "",
        examplePrompt: "",
      });
      setSelectedSkillId(createdEntityId);
      setActiveTab(destinationTab);
      setOnboardingDismissed(true);
      setIsCreateSkillModalOpen(false);
      setIsSkillSelectorOpen(false);
      setScreen("detail");
      setErrorMessage("");
      router.push(`/dashboard/${createdSkillId}/${destinationTab}`);
    } catch (error) {
      captureClientException(error);
      setErrorMessage(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function createSkillFromModal(name: string, description: string) {
    if (!name.trim()) {
      setErrorMessage("Skill name is required");
      return;
    }

    void createSkill({ name, description, activationSource: "modal", destinationTab: "overview" });
  }

  function createSkillFromActivation(mode: ActivationMode) {
    const cleanName = activationForm.name.trim();
    if (!cleanName) {
      setErrorMessage("Skill name is required");
      return;
    }

    const description = activationSummary(activationForm) || DEFAULT_SKILL_DESCRIPTION;
    const body = buildActivationBody(mode, activationForm);
    setActivationMode(mode);
    captureClientEvent("activation_draft_requested", { mode });
    void createSkill({
      name: cleanName,
      description,
      body,
      activationSource: mode,
      destinationTab: "editor",
    });
  }

  function handleSkillUpdated(nextSkill: Skill) {
    setVisibleSkillsFromApi((current) => {
      const sourceSkills = current ?? skills;
      return sourceSkills.map((skill) =>
        skill.id === nextSkill.id || skill.skillId === nextSkill.skillId
          ? {
              ...skill,
              ...nextSkill,
              accessLevel: skill.accessLevel ?? nextSkill.accessLevel,
              ownerEmail: skill.ownerEmail ?? nextSkill.ownerEmail,
            }
          : skill,
      );
    });
  }

  function handleSkillDeleted(deletedSkill: Skill) {
    setVisibleSkillsFromApi((current) => {
      const sourceSkills = current ?? skills;
      return sourceSkills.filter((skill) => skill.id !== deletedSkill.id && skill.skillId !== deletedSkill.skillId);
    });
    setSelectedSkillId(null);
    setActiveTab("overview");
    setScreen("list");
    setErrorMessage("");
    pushDashboardPath(router, "/dashboard");
  }

  const isEditorSurface = activeTab === "editor" && viewState.kind === "detail";

  return (
    <main
      data-dashboard-route={routeName}
      data-initial-skill-id={initialSkillId}
      data-initial-tab={initialTab}
      className="min-h-screen overflow-x-hidden bg-[var(--paper)] text-[var(--ink)]"
    >
      <div aria-hidden className="marketing-noise" />
      <div
        className={`grid min-h-screen min-w-0 grid-cols-1 transition-opacity lg:h-screen lg:grid-cols-[15rem_minmax(0,1fr)] ${
          shouldShowOnboardingModal ? "opacity-45" : ""
        }`}
        aria-hidden={shouldShowOnboardingModal ? true : undefined}
      >
        <DashboardSidebar
          user={user}
          skills={skills}
          selectedSkill={selectedSkill}
          activeTab={screen === "create" ? "editor" : activeTab}
          selectedId={viewState.kind === "detail" ? viewState.skillId : selectedSkillId}
          isSkillSelectorOpen={isSkillSelectorOpen}
          onSelect={(skill) => {
            captureClientEvent("skill_selected", { skill_name: skill.name });
            setSelectedSkillId(skill.id);
            setOnboardingDismissed(true);
            setIsSkillSelectorOpen(false);
            setIsAccountMenuOpen(false);
            setScreen("detail");
            setErrorMessage("");
            const nextTab: SkillRouteTab = isSkillRouteTab(activeTab)
              ? resolveDashboardTabForSkill(skill, activeTab) as SkillRouteTab
              : "overview";
            setActiveTab(nextTab);
            pushDashboardPath(router, skillRoute(skill, nextTab));
          }}
          onTabChange={openDashboardTab}
          onToggleSkillSelector={() => {
            setIsSkillSelectorOpen((current) => !current);
            setIsAccountMenuOpen(false);
          }}
          onOpenCreateSkill={openCreateSkillModal}
          onSignOut={handleSignOut}
        />

        <section className={`min-w-0 ${isEditorSurface ? "lg:h-screen lg:overflow-hidden" : "lg:h-screen lg:overflow-y-auto"}`}>
          {activeTab === "account" ? (
            <AccountSettingsWorkspace
              user={user}
              isAccountMenuOpen={isAccountMenuOpen}
              theme={theme}
              onThemeChange={setTheme}
              onToggleAccountMenu={() => {
                setIsAccountMenuOpen((current) => !current);
                setIsSkillSelectorOpen(false);
              }}
              onOpenAccountSettings={() => openDashboardTab("account")}
              onSignOut={handleSignOut}
            />
          ) : viewState.kind === "create" ? (
            <div className="px-5 py-8 sm:px-8 lg:px-11 lg:py-12">
              <SkillForm
                form={skillForm}
                onSubmit={(name, description) =>
                  void createSkill({ name, description, activationSource: "manual", destinationTab: "overview" })
                }
                onCancel={() => {
                  setScreen("list");
                  setErrorMessage("");
                }}
                onInputChange={setSkillForm}
              />
            </div>
          ) : viewState.kind === "detail" && selectedSkill ? (
            <SkillDetail
              skill={selectedSkill}
              entries={selectedFeedback}
              usageEvents={selectedUsageEvents}
              user={user}
              activeTab={activeTab}
              onTabChange={openDashboardTab}
              onSkillUpdated={handleSkillUpdated}
              onSkillDeleted={handleSkillDeleted}
              onBack={() => {
                setSelectedSkillId(null);
                setActiveTab("overview");
                setScreen("list");
              }}
            />
          ) : shouldShowActivationWorkspace ? (
            <ActivationWorkspace
              mode={activationMode}
              form={activationForm}
              isSubmitting={isSubmitting}
              onModeSelect={(mode) => {
                setActivationMode(mode);
                setErrorMessage("");
              }}
              onFormChange={setActivationForm}
              onStartImport={() => {
                captureClientEvent("activation_github_import_clicked");
                void openGitHubInstall("activation_workspace");
              }}
              onCreate={createSkillFromActivation}
            />
          ) : (
            <div className="px-5 py-8 sm:px-8 lg:px-11 lg:py-12">
              <EmptyState
                onCreate={openCreateSkill}
                onOpenOnboarding={openOnboarding}
              />
            </div>
          )}

          {errorMessage ? (
            <p className="mx-5 mb-8 border border-red-600 bg-red-50 p-3 font-editorial-mono text-xs font-bold uppercase text-red-700 sm:mx-8 lg:mx-11">
              {errorMessage}
            </p>
          ) : null}
        </section>
      </div>
      {isCreateSkillModalOpen ? (
        <CreateSkillModal
          form={modalSkillForm}
          onChange={setModalSkillForm}
          onCancel={() => {
            setIsCreateSkillModalOpen(false);
            setErrorMessage("");
          }}
          onSubmit={createSkillFromModal}
          onImportFromGitHub={() => {
            captureClientEvent("create_skill_modal_github_import_clicked");
            void openGitHubInstall("create_skill_modal");
          }}
        />
      ) : null}
      {githubImportSessionId ? (
        <GitHubImportModal
          state={githubImportState}
          candidates={githubImportCandidates}
          connectedRepositories={githubConnectedRepositories}
          selectedCandidateIds={selectedGitHubImportIds}
          warnings={githubImportWarnings}
          isImporting={isGitHubImporting}
          importError={githubImportError}
          onToggleCandidate={toggleGitHubImportCandidate}
          onImport={() => void importSelectedGitHubSkills()}
          onClose={closeGitHubImportModal}
          onChangeRepositoryAccess={() => {
            void openGitHubInstall("github_import_modal", "configure");
          }}
        />
      ) : null}
    </main>
  );
}
