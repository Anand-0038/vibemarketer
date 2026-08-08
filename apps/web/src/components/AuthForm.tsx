"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { signupErrorMessage, signupOutcome } from "@/lib/auth/errors";
import {
  normalizeEmail,
  validateEmail,
  validatePassword,
} from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";
import { SITE_EMAIL, siteUrl } from "@/lib/site";

type Mode = "login" | "signup";

const googleOAuthEnabled =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH === "1";

export function AuthForm({
  mode,
  next = "/app",
  authReady,
}: {
  mode: Mode;
  next?: string;
  authReady: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function callbackUrl(): string {
    const url = new URL(siteUrl("/auth/callback"));
    url.searchParams.set("next", next);
    return url.toString();
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authReady || pending || googlePending) return;

    setPending(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const emailRaw = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    const emailError = validateEmail(emailRaw);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setError(emailError ?? passwordError ?? "Invalid account details.");
      setPending(false);
      return;
    }
    if (mode === "signup" && password !== confirm) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }

    try {
      const supabase = createClient();
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: normalizeEmail(emailRaw),
          password,
        });
        if (authError) {
          const code = (authError as { code?: string }).code ?? "";
          const text = (authError.message || "").toLowerCase();
          setError(
            code === "email_not_confirmed" || text.includes("email not confirmed")
              ? "This account still needs email confirmation. This challenge deployment does not rely on OTP delivery for new accounts; use a different address or ask the owner to configure SMTP."
              : "Invalid email or password.",
          );
          return;
        }
        window.location.assign(next);
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: normalizeEmail(emailRaw),
        password,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (authError) {
        setError(signupErrorMessage(authError));
        return;
      }
      if (data.session) {
        window.location.assign(next);
        return;
      }

      const outcome = signupOutcome({
        hasSession: false,
        identityCount: data.user?.identities?.length,
      });
      if (outcome?.kind === "existing_account") setError(outcome.message);
      else {
        setMessage(
          outcome?.message ||
            "Account created. Check your email to finish confirmation before signing in.",
        );
      }
    } catch {
      setError("Authentication is temporarily unavailable. Try again shortly.");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    if (!authReady || pending || googlePending) return;
    setGooglePending(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl(),
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (authError || !data.url) {
        setError(
          "Google sign-in isn’t available right now. Use email and password instead.",
        );
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Google sign-in isn’t available right now. Use email and password instead.");
    } finally {
      setGooglePending(false);
    }
  }

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 55% 70% at 85% 45%, var(--glow-accent), transparent 60%), radial-gradient(ellipse 40% 50% at 10% 80%, var(--glow-cool), transparent 55%)",
        }}
      />
      <div className="site-shell relative py-14 lg:py-20">
        <div className="mx-auto w-full max-w-md">
          <p className="rise section-label mb-4">Account</p>
          <h1 className="rise-delay font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {mode === "login" ? "Sign in" : "Create account"}
          </h1>
          <p className="rise-delay-2 mt-4 text-base text-muted">
            {mode === "login"
              ? googleOAuthEnabled
                ? "Sign in with Google or your email and password."
                : "Sign in with your email and password."
              : googleOAuthEnabled
                ? "Create an account with Google or email and password (8+ characters, include a letter and a number)."
                : "Create an account with email and password (8+ characters, include a letter and a number)."}
          </p>
          {mode === "signup" ? (
            <p className="mt-3 text-sm text-muted">
              New accounts in this challenge deployment activate immediately —
              judges do not need an OTP or inbox step. Older accounts may still
              require confirmation; if no message arrives, use a different
              address or contact the service owner.
            </p>
          ) : null}

          {!authReady ? (
            <div
              className="panel mt-8 border-warn/40 p-4 text-sm text-muted"
              role="status"
            >
              Sign-in is temporarily unavailable. Email{" "}
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="text-accent hover:underline"
              >
                {SITE_EMAIL}
              </a>{" "}
              or try again shortly.
            </div>
          ) : null}

          <div className="panel mt-8 space-y-0 border-accent/20 p-6 sm:p-7">
      {googleOAuthEnabled ? (
        <>
          <form method="post" onSubmit={(event) => { event.preventDefault(); void handleGoogle(); }}>
            <button
              type="submit"
              className="btn-ghost focus-ring flex w-full items-center justify-center gap-2 text-base"
              disabled={!authReady || googlePending || pending}
            >
              <GoogleMark />
              {googlePending ? "Redirecting…" : "Continue with Google"}
            </button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            or email
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      ) : null}

      <form method="post" onSubmit={(event) => void handleEmailSubmit(event)} className="space-y-4">
        <div>
          <label htmlFor="email" className="section-label mb-2 block">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className="input-field w-full"
            placeholder="you@company.com"
            disabled={!authReady || pending || googlePending}
          />
        </div>
        <div>
          <label htmlFor="password" className="section-label mb-2 block">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            maxLength={72}
            className="input-field w-full"
            disabled={!authReady || pending || googlePending}
          />
        </div>
        {mode === "signup" ? (
          <div>
            <label htmlFor="confirm" className="section-label mb-2 block">
              Confirm password
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              className="input-field w-full"
              disabled={!authReady || pending || googlePending}
            />
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-accent" role="status">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          className="btn-primary focus-ring w-full text-base"
          disabled={!authReady || pending || googlePending}
        >
          {pending
            ? mode === "login"
              ? "Signing in…"
              : "Creating…"
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>
          </div>

          <p className="mt-8 text-sm text-muted">
            {mode === "login" ? (
              <>
                No account?{" "}
                <Link
                  href={`/signup?next=${encodeURIComponent(next)}`}
                  className="text-accent hover:underline"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  href={`/login?next=${encodeURIComponent(next)}`}
                  className="text-accent hover:underline"
                >
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-2.9-11.3-7.1l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 37.3 44 32 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
