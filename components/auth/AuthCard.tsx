"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import {
  SegmentedControl,
  segmentedPanelId,
  segmentedTabId,
} from "@/components/ui/SegmentedControl";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/errors";

export type AuthMode = "login" | "register";

interface FieldErrors {
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

/*
 * Labels already render in Source Sans 3 (the interface/chrome face), but the
 * fields did not: `globals.css` still carries an UNLAYERED
 * `input, textarea, button { font-family: inherit }` rule, and unlayered
 * declarations outrank every layered Tailwind utility, so the `font-ui` class
 * that Input already applies was silently losing to the inherited body serif.
 * That left labels sans and typed text/placeholders serif in the same form.
 *
 * Scoped here on purpose: moving that rule into `@layer base` would change every
 * input, textarea and <button> in the app, which is outside this task. `!` is
 * needed because no ordinary utility can outrank an unlayered declaration, and
 * 16px keeps mobile browsers from zooming on focus.
 */
const AUTH_FIELD_CLASS = "font-ui! text-[16px]";

const STRENGTH_LEVELS = [
  { label: "Weak", bar: "bg-[var(--color-error)]", text: "text-[var(--color-danger)]" },
  { label: "Fair", bar: "bg-[var(--color-warning)]", text: "text-[var(--color-warning)]" },
  { label: "Strong", bar: "bg-[var(--color-success)]", text: "text-[var(--color-success)]" },
  { label: "Excellent", bar: "bg-[var(--color-success)]", text: "text-[var(--color-success)]" },
];

const TABS_ID = "auth-mode";

const TABS = [
  { value: "login" as const, label: "Sign in" },
  { value: "register" as const, label: "Create account" },
];

interface AuthCardProps {
  /** Which form the route it was opened on represents. */
  initialMode: AuthMode;
  /** Lets the route mirror the selected mode into the URL. */
  onModeChange?: (mode: AuthMode) => void;
}

/**
 * One card for `/login` and `/register`. The segmented control and the card shell
 * never change between modes — only the panel below them does — so switching
 * cannot move the card's top edge or its control.
 */
export function AuthCard({ initialMode, onModeChange }: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
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
  const reduceMotion = useReducedMotion();

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

  function switchMode(next: AuthMode) {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setFieldErrors({});
    // Credentials never survive a switch, and the username only exists in the
    // registration form, so it must not linger when returning to sign in. The
    // email is deliberately kept so the visitor does not retype it.
    setPassword("");
    setConfirmPassword("");
    if (next === "login") setUsername("");
    onModeChange?.(next);
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

  return (
    <section
      aria-labelledby="auth-heading"
      className="h-fit w-full max-w-[30rem] rounded-[var(--radius-surface)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-[var(--shadow-card)] sm:p-8"
    >
      <SegmentedControl
        idBase={TABS_ID}
        label="Authentication mode"
        options={TABS}
        value={mode}
        onChange={switchMode}
      />

      {/*
        One panel whose contents swap, so every tab's aria-controls resolves.
        Keyed on the mode so the content below the control crossfades instead of
        snapping; `initial={false}` makes the switch instant under reduced motion.
      */}
      <motion.div
        key={mode}
        role="tabpanel"
        id={segmentedPanelId(TABS_ID)}
        aria-labelledby={segmentedTabId(TABS_ID, mode)}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="mt-6"
      >
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

        {auth.status === "authenticated" && (
          <div className="mt-6 rounded-[var(--radius-control)] border border-[var(--color-border)] px-4 py-3 font-ui text-sm">
            You are signed in as {auth.user?.username ?? "user"}.
            <button type="button" onClick={handleLogout} className="focus-ring ml-2 rounded underline">
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
            className={AUTH_FIELD_CLASS}
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
              className={AUTH_FIELD_CLASS}
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
            className={AUTH_FIELD_CLASS}
          />

          {mode === "register" && password.length > 0 && (
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
          )}

          {mode === "register" && (
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
              className={AUTH_FIELD_CLASS}
            />
          )}

          {/*
            A reserved, single live region for form-level messages. Keeping the slot
            in the layout means an error never shifts the primary button sideways
            and never moves the card's top edge.
          */}
          <div className="flex min-h-9 items-center" aria-live="polite">
            {error && (
              <div className="flex items-start gap-3 rounded-[var(--radius-control)] border border-[rgba(247,179,168,0.35)] bg-[var(--color-error-surface)] px-3.5 py-3 font-ui text-sm text-[var(--color-danger)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            tone="dark"
            className="w-full"
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
      </motion.div>
    </section>
  );
}
