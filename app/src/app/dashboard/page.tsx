"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { type AppSchema } from "@/instant.schema";
import { type InstaQLEntity, id } from "@instantdb/react";
import type { User as InstantUser } from "@instantdb/core";
import { resolveDashboardViewState } from "./view-state";
import posthog from "posthog-js";

type Skill = InstaQLEntity<AppSchema, "skills">;
type Feedback = InstaQLEntity<AppSchema, "feedback">;
type AppUser = InstantUser;
type Screen = "list" | "create" | "detail";
type AuthPhase = "request" | "verify";

type AuthForm = {
  email: string;
  code: string;
};

type SkillForm = {
  name: string;
  description: string;
};

const BRUTAL_CARD =
  "border-4 border-black bg-white text-black";
const BRUTAL_BUTTON =
  "border-4 border-black bg-black px-4 py-2 text-sm font-black uppercase text-white transition-all hover:bg-yellow-300 hover:text-black";
const BRUTAL_INPUT =
  "mt-1 w-full border-4 border-black bg-white px-3 py-2 text-sm outline-none";

const FEEDBACK_SNIPPET_URL = "/feedback-template.md";

function randomSkillId() {
  const chars = "abcdefghijkmnopqrstuvwxyz23456789";
  let out = "sk_";
  for (let i = 0; i < 10; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function toMillis(value: number | Date | null | undefined) {
  if (typeof value === "number") {
    return value;
  }
  return value instanceof Date ? value.getTime() : 0;
}

function formatDate(value: number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ratingSummary(feedback: Feedback[]) {
  return {
    positive: feedback.filter((entry) => entry.rating === "positive").length,
    negative: feedback.filter((entry) => entry.rating === "negative").length,
    neutral: feedback.filter((entry) => entry.rating === "neutral").length,
  };
}

function renderFeedbackTemplate(template: string, skillId: string) {
  const feedbackUrl = `https://www.skillfully.sh/feedback/${skillId}`;
  return template.replaceAll("{{feedbackUrl}}", feedbackUrl);
}

function displayUserEmail(user: AppUser | null | undefined) {
  return user?.email || "authenticated user";
}

function extractErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Something went wrong";
  }

  if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message?: string }).message ?? "Something went wrong";
  }

  const maybeBody = (error as { body?: unknown }).body;
  if (
    typeof maybeBody === "object" &&
    maybeBody !== null &&
    "message" in (maybeBody as { message?: unknown }) &&
    typeof (maybeBody as { message?: unknown }).message === "string"
  ) {
    return String((maybeBody as { message?: string }).message);
  }

  return "Something went wrong";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function AppHeader({ user, onSignOut }: { user: AppUser; onSignOut: () => void }) {
  return (
    <header className="border-b-4 border-black bg-white px-4 py-3 md:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="text-lg font-black uppercase tracking-tight text-black">
          skillfully
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-black uppercase">{displayUserEmail(user)}</span>
          <button
            type="button"
            className="border-4 border-black bg-white px-3 py-1.5 font-black uppercase text-black transition-all hover:bg-black hover:text-white"
            onClick={onSignOut}
          >
            sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function AuthForm({
  phase,
  form,
  email,
  onEmailSubmit,
  onVerifySubmit,
  onEmailChange,
  onCodeChange,
  onChangeMode,
  disabled,
  message,
}: {
  phase: AuthPhase;
  form: AuthForm;
  email: string;
  onEmailSubmit: () => void;
  onVerifySubmit: () => void;
  onEmailChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onChangeMode: () => void;
  disabled: boolean;
  message: string;
}) {
  const isRequest = phase === "request";

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-6">
      <div className="w-full max-w-md space-y-3">
        <div className={`${BRUTAL_CARD} p-6`}>
          <h2 className="text-xl font-black uppercase">Continue to skillfully</h2>

          <p className="mt-2 text-sm">
            {isRequest
              ? "Enter your email. We\'ll send a one-time code."
              : `We sent a code to ${email}.`}
          </p>

          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (isRequest) {
                onEmailSubmit();
              } else {
                onVerifySubmit();
              }
            }}
          >
            {isRequest ? (
              <label className="block text-sm font-black uppercase">
                Email
                <input
                  type="email"
                  className={BRUTAL_INPUT}
                  value={form.email}
                  onChange={(event) => onEmailChange(event.currentTarget.value)}
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  minLength={3}
                />
              </label>
            ) : (
              <label className="block text-sm font-black uppercase">
                Verification code
                <input
                  type="text"
                  className={`${BRUTAL_INPUT} text-center font-mono tracking-[0.3em]`}
                  value={form.code}
                  onChange={(event) => onCodeChange(event.currentTarget.value)}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                />
              </label>
            )}

            <button
              type="submit"
              disabled={disabled}
              className={`${BRUTAL_BUTTON} w-full disabled:opacity-50`}
            >
              {isRequest ? "Send code" : "Verify code"}
            </button>
          </form>

          {isRequest ? null : (
            <button
              type="button"
              className="mt-3 text-sm font-black uppercase underline"
              onClick={onChangeMode}
            >
              Use a different email
            </button>
          )}

          {message ? (
            <p className="mt-3 border-4 border-red-600 bg-red-100 p-2 text-sm font-black uppercase">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function SkillForm({
  form,
  onSubmit,
  onCancel,
  onInputChange,
}: {
  form: SkillForm;
  onSubmit: (name: string, description: string) => void;
  onCancel: () => void;
  onInputChange: (value: SkillForm) => void;
}) {
  return (
    <section className={`${BRUTAL_CARD} mx-auto w-full max-w-2xl p-6`}>
      <h2 className="text-xl font-black uppercase">New skill</h2>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onSubmit(form.name.trim(), form.description.trim());
        }}
      >
          <label className="block text-sm font-black uppercase">
            Name
            <input
              value={form.name}
              className={BRUTAL_INPUT}
              onChange={(event) => onInputChange({ ...form, name: event.currentTarget.value })}
              required
              name="name"
              placeholder='"code-review" or "write-tests"'
          />
        </label>
          <label className="block text-sm font-black uppercase">
            Description (optional)
            <textarea
              value={form.description}
              className={`${BRUTAL_INPUT} min-h-24`}
              onChange={(event) => onInputChange({ ...form, description: event.currentTarget.value })}
              name="description"
              placeholder="What does this skill do?"
            />
          </label>
        <div className="flex gap-3">
          <button
            type="submit"
            className={BRUTAL_BUTTON}
          >
            Create skill
          </button>
          <button
            type="button"
            className="border-4 border-black bg-white px-3 py-2 text-sm font-black uppercase hover:bg-black hover:text-white"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function SkillList({
  skills,
  selectedId,
  onSelect,
}: {
  skills: Skill[];
  selectedId: string | null;
  onSelect: (skill: Skill) => void;
}) {
  return (
    <div className={`${BRUTAL_CARD} p-3`}>
      <p className="mb-2 text-sm font-black uppercase">Your skills</p>
      <div className="space-y-2">
        {skills.length === 0 ? <p className="px-2 py-3 text-sm">No skills yet.</p> : null}
        {skills.map((skill) => {
          const isActive = selectedId === skill.id;
          return (
            <button
              key={skill.id}
              type="button"
              className={`w-full px-3 py-2 text-left ${
                isActive
                  ? "bg-black text-white"
                  : "border-2 border-transparent hover:border-black hover:bg-gray-100"
              }`}
              onClick={() => onSelect(skill)}
            >
              <p className="text-sm font-black uppercase">{skill.name}</p>
              <p className="truncate text-xs font-mono">{skill.skillId}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className={`${BRUTAL_CARD} p-6`}>
      <h2 className="text-xl font-black uppercase">Your skills</h2>
      <p className="mt-3 font-black uppercase">No skills yet.</p>
      <p className="mt-1 text-sm">
        Add your first skill to start collecting feedback.
      </p>
      <button
        type="button"
        className={`${BRUTAL_BUTTON} mt-4`}
        onClick={onCreate}
      >
        + New skill
      </button>
    </section>
  );
}

function SkillDetail({
  skill,
  entries,
  onBack,
  feedbackTemplate,
  feedbackTemplateError,
}: {
  skill: Skill;
  entries: Feedback[];
  onBack: () => void;
  feedbackTemplate: string | null;
  feedbackTemplateError: string | null;
}) {
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [pageLimit, setPageLimit] = useState(10);
  const resolvedTemplate = feedbackTemplate
    ? renderFeedbackTemplate(feedbackTemplate, skill.skillId)
    : null;

  const sorted = [...entries].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  const visible = sorted.slice(0, pageLimit);
  const counts = ratingSummary(entries);

  return (
    <section className={`space-y-4 ${BRUTAL_CARD} p-6`}>
      <button
        type="button"
        className="text-sm font-black uppercase underline"
        onClick={onBack}
      >
        ← Your skills
      </button>

      <h2 className="text-xl font-black uppercase">{skill.name}</h2>

      <div>
        <p className="text-sm font-black uppercase">Add this to your skill:</p>
        <pre className="mt-2 max-h-48 overflow-auto border-4 border-black bg-black p-4 font-mono text-sm whitespace-pre-wrap text-gray-100">
          {resolvedTemplate || "Loading feedback template..."}
        </pre>
        <button
          type="button"
          className="mt-2 border-4 border-black bg-white px-3 py-2 text-sm font-black uppercase transition-all hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!resolvedTemplate}
          onClick={async () => {
            if (!resolvedTemplate) return;
            await navigator.clipboard.writeText(resolvedTemplate);
            posthog.capture("snippet_copied", { skill_name: skill.name, skill_id: skill.skillId });
            setSnippetCopied(true);
            window.setTimeout(() => setSnippetCopied(false), 1200);
          }}
        >
          {snippetCopied ? "Copied! ✓" : resolvedTemplate ? "Copy snippet" : "Loading snippet..."}
        </button>
        {feedbackTemplateError ? (
          <p className="mt-2 border-4 border-red-600 bg-red-100 p-2 text-xs font-black uppercase">
            {feedbackTemplateError}
          </p>
        ) : null}
      </div>

      <div className={`${BRUTAL_CARD} p-4`}>
        <div className="flex items-center justify-between text-sm font-black uppercase">
          <p>Feedback {sorted.length} responses</p>
          <p>
            positive {counts.positive} · negative {counts.negative} · neutral {counts.neutral}
          </p>
        </div>

        {sorted.length === 0 ? (
          <p className="mt-3 text-sm">
            No feedback yet. Use your skill to see the first response appear here.
          </p>
        ) : (
          <>
            <ul className="mt-3 space-y-2">
              {visible.map((entry) => (
                <li key={entry.id} className="border-2 border-black bg-white p-3 text-sm">
                  <p className="mb-1 font-black uppercase">
                    <span className="mr-2 rounded border border-black px-2 py-0.5 text-xs">
                      {entry.rating}
                    </span>
                    <span className="ml-1 font-mono text-xs font-normal">
                      {formatDate(entry.createdAt as number | Date)}
                    </span>
                  </p>
                  <p>{entry.feedback}</p>
                </li>
              ))}
            </ul>
            {sorted.length > pageLimit ? (
              <button
                type="button"
                className="mt-3 text-sm font-black uppercase underline"
                onClick={() => {
                  posthog.capture("feedback_load_more_clicked", { skill_name: skill.name });
                  setPageLimit((current) => current + 10);
                }}
              >
                Load more
              </button>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { isLoading: isAuthLoading, user, error: authHookError } = db.useAuth();
  const [screen, setScreen] = useState<Screen>("list");
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const [authPhase, setAuthPhase] = useState<AuthPhase>("request");
  const [authForm, setAuthForm] = useState<AuthForm>({ email: "", code: "" });
  const [pendingEmail, setPendingEmail] = useState("");

  const [skillForm, setSkillForm] = useState<SkillForm>({
    name: "",
    description: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackTemplate, setFeedbackTemplate] = useState<string | null>(null);
  const [feedbackTemplateError, setFeedbackTemplateError] = useState<string | null>(null);

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
    } as const;
  }, [user?.id]);

  const { isLoading: isDataLoading, error: dataError, data } = db.useQuery(query);

  const skills = (data?.skills ?? []) as Skill[];
  const feedback = (data?.feedback ?? []) as Feedback[];

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

  useEffect(() => {
    let active = true;

    void fetch(FEEDBACK_SNIPPET_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch feedback template: ${response.status}`);
        }
        return response.text();
      })
      .then((content) => {
        if (!active) return;
        const normalized = content.trim();
        if (!normalized) {
          throw new Error("Feedback template file is empty.");
        }
        setFeedbackTemplate(normalized);
        setFeedbackTemplateError(null);
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof Error) {
          setFeedbackTemplateError(error.message);
          return;
        }
        setFeedbackTemplateError("Unable to load feedback template.");
      });

    return () => {
      active = false;
    };
  }, []);

  if (isAuthLoading || (user && isDataLoading)) {
    return <main className="min-h-screen overflow-x-hidden border-x-4 border-black bg-white" />;
  }

  if (authHookError) {
    return (
      <main className="min-h-screen overflow-x-hidden border-x-4 border-black bg-white p-6 text-red-700">
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

          posthog.capture("auth_email_submitted", { email: normalized });
          setIsSubmitting(true);
          try {
            await db.auth.sendMagicCode({ email: normalized });
            setPendingEmail(normalized);
            setAuthForm((state) => ({ ...state, email: normalized, code: "" }));
            setAuthPhase("verify");
          } catch (error) {
            posthog.captureException(error);
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

          setIsSubmitting(true);
          try {
            const response = await db.auth.signInWithMagicCode({
              email: normalized,
              code,
            });

            if (response.user) {
              posthog.identify(response.user.id, { email: normalized });
              posthog.capture("auth_code_verified", { email: normalized });
              return;
            }

            setErrorMessage("Could not verify code yet. Try again.");
          } catch (error) {
            posthog.captureException(error);
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
          setAuthForm((state) => ({ ...state, code: value }));
        }}
        onChangeMode={() => {
          setErrorMessage("");
          setAuthPhase("request");
          setAuthForm((state) => ({ ...state, code: "" }));
        }}
      />
    );
  }

  if (dataError) {
    return (
      <main className="min-h-screen overflow-x-hidden border-x-4 border-black bg-white p-6 text-red-700">
        Data load failed: {dataError.message}
      </main>
    );
  }

  async function handleSignOut() {
    posthog.capture("user_signed_out");
    posthog.reset();
    setErrorMessage("");
    setSkillForm({ name: "", description: "" });
    setAuthForm({ email: "", code: "" });
    setAuthPhase("request");
    setSelectedSkillId(null);
    setScreen("list");

    await db.auth.signOut({ invalidateToken: true });
  }

  function createSkill(name: string, description: string) {
    if (!user) {
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage("Skill name is required");
      return;
    }

    const cleanDescription = description.trim() || undefined;
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

    posthog.capture("skill_created", {
      skill_name: cleanName,
      has_description: Boolean(cleanDescription),
    });

    setSkillForm({ name: "", description: "" });
    setSelectedSkillId(newSkillEntityId);
    setScreen("detail");
    setErrorMessage("");
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden border-x-4 border-black bg-white text-black"
      style={{ backgroundImage: "linear-gradient(to right, #f3f4f6 1px, transparent 1px), linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)", backgroundSize: "40px 40px" }}
    >
      <AppHeader user={user} onSignOut={handleSignOut} />
      <div className="mx-auto flex w-full max-w-6xl gap-5 px-4 py-6 md:px-8">
        <aside className="w-72 shrink-0">
          <button
            type="button"
            className={`${BRUTAL_BUTTON} mb-3 w-full`}
            onClick={() => {
              setErrorMessage("");
              setScreen("create");
            }}
          >
            + New skill
          </button>

          <SkillList
            skills={skills}
            selectedId={viewState.kind === "detail" ? viewState.skillId : null}
            onSelect={(skill) => {
              posthog.capture("skill_selected", { skill_name: skill.name });
              setSelectedSkillId(skill.id);
              setScreen("detail");
              setErrorMessage("");
            }}
          />
        </aside>

        <section className="flex-1 space-y-3">
          {viewState.kind === "create" ? (
            <SkillForm
              form={skillForm}
              onSubmit={createSkill}
              onCancel={() => {
                setScreen("list");
                setErrorMessage("");
              }}
              onInputChange={setSkillForm}
            />
          ) : viewState.kind === "detail" && selectedSkill ? (
            <SkillDetail
              skill={selectedSkill}
              entries={selectedFeedback}
              feedbackTemplate={feedbackTemplate}
              feedbackTemplateError={feedbackTemplateError}
              onBack={() => {
                setSelectedSkillId(null);
                setScreen("list");
              }}
            />
          ) : (
            <EmptyState
              onCreate={() => {
                setErrorMessage("");
                setScreen("create");
              }}
            />
          )}

          {errorMessage ? (
            <p className="rounded border-4 border-red-600 bg-red-100 p-2 text-sm font-black uppercase">
              {errorMessage}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
