"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { AuthQuietLink, FormMessageRegion } from "@/components/auth/AuthFormParts";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import {
  SegmentedControl,
  segmentedPanelId,
  segmentedTabId,
} from "@/components/ui/SegmentedControl";
import {
  AUTH_CARD_SURFACE,
  AUTH_CARD_WIDTH,
  AUTH_FIELD_CLASS,
} from "@/components/auth/AuthLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import {
  AuthFieldErrors,
  AuthMode,
  AuthValues,
  mapAuthError,
  validateField,
  validateForm,
} from "@/lib/authValidation";

const TABS_ID = "auth-mode";

const EMAIL_FIELD_ID = "auth-email";

const TABS = [
  { value: "login" as const, label: "Sign in" },
  { value: "register" as const, label: "Create account" },
];

interface AuthCardProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}

export function AuthCard({ mode, onModeChange }: AuthCardProps) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);
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
  const values: AuthValues = { email, username, password, confirmPassword };

  useEffect(() => {
    document.getElementById(EMAIL_FIELD_ID)?.focus();
  }, []);

  function handleFieldChange(field: keyof AuthValues, value: string) {
    if (field === "email") {
      setEmail(value);
    } else if (field === "username") {
      setUsername(value);
    } else if (field === "password") {
      setPassword(value);
    } else {
      setConfirmPassword(value);
    }

    setError(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      if (field === "password" && mode === "register" && confirmPassword) {
        if (value !== confirmPassword) next.confirmPassword = "Passwords do not match.";
        else delete next.confirmPassword;
      }
      return next;
    });
  }

  function handleFieldBlur(field: keyof AuthValues) {
    if (!values[field]) return;
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, values, mode) }));
  }

  function switchMode(next: AuthMode) {
    if (next === mode) return;
    setError(null);
    setFieldErrors({});
    setPassword("");
    setConfirmPassword("");
    if (next === "login") setUsername("");
    onModeChange(next);
  }

  async function handleSubmit() {
    if (submitLockRef.current) return;
    setError(null);

    const errors = validateForm(values, mode);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    submitLockRef.current = true;
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
      const mapped = mapAuthError(err, mode);
      setFieldErrors(mapped.fieldErrors);
      setError(mapped.formError);
    } finally {
      submitLockRef.current = false;
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
      className={`${AUTH_CARD_SURFACE} ${AUTH_CARD_WIDTH}`}
    >
      <SegmentedControl
        idBase={TABS_ID}
        label="Authentication mode"
        options={TABS}
        value={mode}
        onChange={switchMode}
        glossy
      />

      <motion.div
        key={mode}
        role="tabpanel"
        id={segmentedPanelId(TABS_ID)}
        aria-labelledby={segmentedTabId(TABS_ID, mode)}
        initial={{ opacity: reduceMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.18 }}
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
          noValidate
          className="mt-6 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <Input
            id={EMAIL_FIELD_ID}
            label="Email address"
            type="email"
            value={email}
            onChange={(event) => handleFieldChange("email", event.target.value)}
            onBlur={() => handleFieldBlur("email")}
            error={fieldErrors.email}
            disabled={loading}
            autoComplete="email"
            className={AUTH_FIELD_CLASS}
          />

          {mode === "register" && (
            <Input
              label="Username"
              value={username}
              onChange={(event) => handleFieldChange("username", event.target.value)}
              onBlur={() => handleFieldBlur("username")}
              error={usernameError}
              disabled={loading}
              autoComplete="username"
              className={AUTH_FIELD_CLASS}
            />
          )}

          <div className="flex flex-col gap-1.5">
            <PasswordField
              label="Password"
              value={password}
              onChange={(event) => handleFieldChange("password", event.target.value)}
              onBlur={() => handleFieldBlur("password")}
              error={fieldErrors.password}
              disabled={loading}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={AUTH_FIELD_CLASS}
            />
            {mode === "login" && (
              <div className="flex justify-end">
                <AuthQuietLink href="/forgot-password">Forgot password?</AuthQuietLink>
              </div>
            )}
          </div>

          {mode === "register" && <PasswordStrengthMeter password={password} />}

          {mode === "register" && (
            <PasswordField
              label="Confirm password"
              value={confirmPassword}
              onChange={(event) => handleFieldChange("confirmPassword", event.target.value)}
              onBlur={() => handleFieldBlur("confirmPassword")}
              error={confirmError}
              disabled={loading}
              autoComplete="new-password"
              className={AUTH_FIELD_CLASS}
            />
          )}

          <FormMessageRegion message={error} />

          <Button
            type="submit"
            size="lg"
            tone="dark"
            className="w-full font-ui!"
            disabled={loading}
            aria-busy={loading}
          >
            {loading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
            )}
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
