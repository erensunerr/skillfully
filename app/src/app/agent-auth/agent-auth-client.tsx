"use client";

import { type FormEvent, useState } from "react";
import { db } from "@/lib/db";
import { captureClientException } from "@/lib/client-analytics";

type AuthPhase = "request" | "verify";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}

async function approvalJson<T>(refreshToken: string, code: string): Promise<T> {
  const response = await fetch("/api/agent/auth/device/approve", {
    method: "POST",
    headers: {
      authorization: `Bearer ${refreshToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ user_code: code }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : `Request failed: ${response.status}`);
  }
  return payload as T;
}

export default function AgentAuthClient({ initialCode }: { initialCode: string }) {
  const { isLoading, user, error: authError } = db.useAuth();
  const [phase, setPhase] = useState<AuthPhase>("request");
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [magicCode, setMagicCode] = useState("");
  const [deviceCode, setDeviceCode] = useState(initialCode);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    const normalized = email.trim().toLowerCase();
    if (!isValidEmail(normalized)) {
      setStatus("Enter a valid email.");
      return;
    }
    setIsSubmitting(true);
    try {
      await db.auth.sendMagicCode({ email: normalized });
      setPendingEmail(normalized);
      setPhase("verify");
    } catch (error) {
      captureClientException(error);
      setStatus(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    const normalized = pendingEmail || email.trim().toLowerCase();
    if (!normalized || !magicCode.trim()) {
      setStatus("Enter the verification code.");
      return;
    }
    setIsSubmitting(true);
    try {
      await db.auth.signInWithMagicCode({
        email: normalized,
        code: magicCode.trim(),
      });
    } catch (error) {
      captureClientException(error);
      setStatus(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function approveAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.refresh_token) {
      setStatus("Sign in again before approving this agent.");
      return;
    }
    setStatus("");
    setIsSubmitting(true);
    try {
      const result = await approvalJson<{ agent_name: string; scope: string }>(
        user.refresh_token,
        deviceCode,
      );
      setStatus(`${result.agent_name} can now edit your Skillfully skills.`);
    } catch (error) {
      captureClientException(error);
      setStatus(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <main className="min-h-screen bg-[var(--paper)]" />;
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-5 py-8 text-[var(--ink)] sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-3xl gap-8">
        <header className="border-b border-[var(--ink)] pb-6">
          <p className="font-editorial-mono text-xs font-bold uppercase">Skillfully agent auth</p>
          <h1 className="mt-4 font-editorial-sans text-5xl font-bold leading-none sm:text-6xl">
            Connect author agent
          </h1>
        </header>

        {authError ? (
          <p className="border border-red-600 bg-red-50 p-4 font-editorial-mono text-xs font-bold uppercase text-red-700">
            Sign-in failed: {authError.message}
          </p>
        ) : null}

        {!user ? (
          <section className="border border-[var(--ink)] bg-[var(--white)] p-5">
            {phase === "request" ? (
              <form className="grid gap-4" onSubmit={requestCode}>
                <label className="grid gap-2">
                  <span className="font-editorial-sans text-sm font-semibold">Email</span>
                  <input
                    className="border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 font-editorial-mono text-sm outline-none"
                    value={email}
                    onChange={(event) => setEmail(event.currentTarget.value)}
                    autoComplete="email"
                  />
                </label>
                <button
                  type="submit"
                  className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-4 font-editorial-sans text-base font-semibold text-[var(--paper)] disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send sign-in code"}
                </button>
              </form>
            ) : (
              <form className="grid gap-4" onSubmit={verifyCode}>
                <label className="grid gap-2">
                  <span className="font-editorial-sans text-sm font-semibold">Verification code</span>
                  <input
                    className="border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 font-editorial-mono text-sm outline-none"
                    value={magicCode}
                    onChange={(event) => setMagicCode(event.currentTarget.value)}
                    autoComplete="one-time-code"
                  />
                </label>
                <button
                  type="submit"
                  className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-4 font-editorial-sans text-base font-semibold text-[var(--paper)] disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Verifying..." : "Sign in"}
                </button>
                <button
                  type="button"
                  className="text-left font-editorial-mono text-xs font-bold uppercase underline"
                  onClick={() => setPhase("request")}
                >
                  Use another email
                </button>
              </form>
            )}
          </section>
        ) : (
          <section className="border border-[var(--ink)] bg-[var(--white)] p-5">
            <form className="grid gap-4" onSubmit={approveAgent}>
              <label className="grid gap-2">
                <span className="font-editorial-sans text-sm font-semibold">Agent code</span>
                <input
                  className="border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 font-editorial-mono text-xl font-bold uppercase tracking-[0.18em] outline-none"
                  value={deviceCode}
                  onChange={(event) => setDeviceCode(event.currentTarget.value.toUpperCase())}
                  autoComplete="one-time-code"
                />
              </label>
              <button
                type="submit"
                className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-4 font-editorial-sans text-base font-semibold text-[var(--paper)] disabled:opacity-50"
                disabled={isSubmitting || !deviceCode.trim()}
              >
                {isSubmitting ? "Approving..." : "Allow agent to edit skills"}
              </button>
            </form>
          </section>
        )}

        {status ? (
          <p className="border border-[var(--ink)] bg-[var(--white)] p-4 font-editorial-mono text-xs font-bold uppercase">
            {status}
          </p>
        ) : null}
      </div>
    </main>
  );
}
