"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { Wordmark } from "@/components/ui/Wordmark";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/errors";

type AuthMode = "login" | "register";

interface FieldErrors {
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

const STRENGTH_LEVELS = [
  { label: "Weak", bar: "bg-[var(--color-error)]", text: "text-[var(--color-danger)]" },
  { label: "Fair", bar: "bg-[var(--color-warning)]", text: "text-[var(--color-warning)]" },
  { label: "Strong", bar: "bg-[var(--color-success)]", text: "text-[var(--color-success)]" },
  { label: "Excellent", bar: "bg-[var(--color-success)]", text: "text-[var(--color-success)]" },
];

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (auth.status === "authenticated") {
      router.replace("/app");
    }
  }, [auth.status, router]);

  const usernameError = mode === "register" ? fieldErrors.username : undefined;
  const confirmError = mode === "register" ? fieldErrors.confirmPassword : undefined;

  const strengthScore = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const strength = strengthScore > 0 ? STRENGTH_LEVELS[strengthScore - 1] : null;

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function switchMode() {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setError(null);
    setFieldErrors({});
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!email.trim()) next.email = "Email address is required.";
    if (mode === "register" && !username.trim()) next.username = "Username is required.";
    if (!password) next.password = "Password is required.";
    if (mode === "register" && password && password !== confirmPassword) {
      next.confirmPassword = "Passwords do not match.";
    }
    setFieldErrors(next);

    if (mode === "register") {
      if (!email.trim() || !username.trim()) {
        setError("Please complete all required fields.");
        return false;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return false;
      }
    }
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "login") {
        await auth.login(email.trim(), password);
        toast.push("Signed in.", "success");
      } else {
        await auth.register({ email: email.trim(), username: username.trim(), password });
        toast.push("Account created.", "success");
      }
      router.push("/app");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await auth.logout();
    toast.push("Signed out.", "success");
  }

  if (auth.status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-forest-deep)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--color-sage)] border-t-transparent" />
          <p className="font-ui text-sm text-[var(--color-text-secondary)]">
            Restoring your session…
          </p>
        </div>
      </div>
    );
  }

  return (
    // Column layout with a single viewport-height root: the header no longer adds
    // an extra 100vh slot, so the page only scrolls when the card genuinely overflows.
    <div className="flex min-h-dvh flex-col bg-[var(--color-forest-deep)] text-[var(--color-parchment)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(110%_80%_at_12%_-10%,rgba(95,141,78,0.32),transparent_58%),radial-gradient(90%_80%_at_100%_115%,rgba(40,84,48,0.6),transparent_60%)]"
      />

      <header className="relative z-20 border-b border-[rgba(40,84,48,0.25)] bg-[var(--color-parchment)]">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-6">
          <Wordmark />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          aria-labelledby="auth-heading"
          className="w-full max-w-[30rem] rounded-[var(--radius-surface)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-7 shadow-[var(--shadow-card)] sm:p-9"
        >
          <div>
            <h1
              id="auth-heading"
              className="font-display text-3xl font-semibold leading-tight text-[var(--color-parchment)]"
            >
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 font-ui text-sm text-[var(--color-text-secondary)]">
              {mode === "login"
                ? "Sign in to pick up where you left off."
                : "Set up your account to start messaging."}
            </p>
            <div className="mt-5 h-px w-full bg-[var(--color-border)]" />
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-[var(--radius-control)] border border-[rgba(247,179,168,0.35)] bg-[var(--color-error-surface)] px-3.5 py-3 font-ui text-sm text-[var(--color-danger)]"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {auth.status === "authenticated" && (
            <div className="mt-6 rounded-[var(--radius-control)] border border-[var(--color-border)] px-4 py-3 font-ui text-sm">
              You are signed in as {auth.user?.username ?? "user"}.
              <button
                type="button"
                onClick={handleLogout}
                className="focus-ring ml-2 rounded underline"
              >
                Sign out
              </button>
            </div>
          )}

          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearFieldError("email");
              }}
              placeholder="you@example.com"
              error={fieldErrors.email}
              disabled={loading}
              autoComplete="email"
            />

            {mode === "register" && (
              <Input
                label="Username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  clearFieldError("username");
                }}
                placeholder="fernwalker"
                error={usernameError}
                disabled={loading}
                autoComplete="username"
              />
            )}

            <PasswordField
              label="Password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearFieldError("password");
              }}
              error={fieldErrors.password}
              disabled={loading}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            {/*
              No "Forgot password?" link: the Auth service exposes
              POST /auth/forgot-password and /auth/reset-password, but the frontend
              has no reset route or flow yet, so a link here would lead nowhere.
              Adding the full flow is left to a later phase (see completion report).
            */}

            {mode === "register" && (
              <>
                <PasswordField
                  label="Confirm password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    clearFieldError("confirmPassword");
                  }}
                  error={confirmError}
                  disabled={loading}
                  autoComplete="new-password"
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between font-ui text-xs text-[var(--color-text-secondary)]">
                    <span>Password strength</span>
                    {strength && (
                      <span className={strength.text} role="status" aria-live="polite">
                        {strength.label}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2" aria-hidden="true">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className={`h-1 rounded-[var(--radius-pill)] ${
                          strength && index < strengthScore
                            ? strength.bar
                            : "bg-[rgba(229,217,182,0.2)]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            <Button
              type="submit"
              size="lg"
              tone="dark"
              className="mt-1 w-full"
              disabled={loading}
            >
              {loading
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center font-ui text-sm text-[var(--color-text-secondary)]">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="focus-ring inline-flex items-center gap-1 rounded font-semibold text-[var(--color-sage)] underline underline-offset-2 hover:text-[var(--color-parchment)]"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </motion.section>
      </main>

      <footer className="relative z-10 px-6 pb-6 text-center">
        <Link
          href="/"
          className="focus-ring rounded font-ui text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
        >
          ← Back to home
        </Link>
      </footer>
    </div>
  );
}
