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

/*
 * A stable id for the first field, so the one-time autofocus can target it without
 * threading a ref through the shared `Input`. The full field order is
 * email → username → password → confirm, so the first field is the email in both
 * modes, which is what the initial focus belongs on.
 */
const EMAIL_FIELD_ID = "auth-email";

const TABS = [
  { value: "login" as const, label: "Sign in" },
  { value: "register" as const, label: "Create account" },
];

interface AuthCardProps {
  /** The mode the current URL represents — the route owns this, not the card. */
  mode: AuthMode;
  /** Mirrors a newly selected mode into the URL. */
  onModeChange: (mode: AuthMode) => void;
}

/**
 * One card for `/login` and `/register`. The segmented control and the card shell
 * never change between modes — only the panel below them does — so switching
 * cannot move the card's top edge or its control.
 */
export function AuthCard({ mode, onModeChange }: AuthCardProps) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [loading, setLoading] = useState(false);
  /*
   * A ref, not the `loading` state, is what actually prevents a duplicate submit:
   * a burst of clicks (or Enter presses) in the same tick all run their handler
   * before React re-renders with `disabled`, so they would all read `loading` as
   * false and fire a second, third and fourth request.
   */
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

  /*
   * Focus the first field once, on the card's own mount — never on a mode switch.
   * The panel below the control is keyed on the mode, so an `autoFocus` attribute
   * there would fire again on every switch and pull focus off the segmented
   * control; this effect lives on the card, which stays mounted.
   */
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

    // A stale message about the field being edited is worse than none, and any
    // form-level message is about the previous attempt.
    setError(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      // Editing the password can invalidate a confirmation that already passed.
      if (field === "password" && mode === "register" && confirmPassword) {
        if (value !== confirmPassword) next.confirmPassword = "Passwords do not match.";
        else delete next.confirmPassword;
      }
      return next;
    });
  }

  function handleFieldBlur(field: keyof AuthValues) {
    // Only report a problem once something has actually been typed; submit is what
    // surfaces every missing required field.
    if (!values[field]) return;
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, values, mode) }));
  }

  function switchMode(next: AuthMode) {
    if (next === mode) return;
    setError(null);
    setFieldErrors({});
    // Credentials never survive a switch, and the username only exists in the
    // registration form, so it must not linger when returning to sign in. The
    // email is deliberately kept so the visitor does not retype it.
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
        /*
          Under reduced motion the panel is handed the FINISHED state on mount
          (`opacity: 1`, zero-duration transition) rather than a suppressed
          animation. `initial={false}` alone was not enough: a keyed remount
          still ran the tween — measured with `prefers-reduced-motion: reduce`
          the new panel mounted at opacity 0 and faded up over ~180ms, exactly
          like the default case.
        */
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

        {/*
          `noValidate` hands validation to this form rather than the browser. The
          email field is `type="email"`, so without it Chrome blocked the submit
          and showed its own unstyleable bubble, and the messages below — with their
          `aria-describedby` wiring and the backend's own rules — never appeared.
        */}
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
              onChange={(event) => handleFieldChange("username", event.target.value)}
              onBlur={() => handleFieldBlur("username")}
              placeholder="fernwalker"
              error={usernameError}
              disabled={loading}
              autoComplete="username"
              className={AUTH_FIELD_CLASS}
            />
          )}

          {/*
            The field and its recover link are one unit, on the same 6px rhythm the
            Input uses between its own label and field, so the link reads as sitting
            under the password field rather than floating between two fields.
          */}
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
            {/* Only sign-in offers recovery: the screen it leads to resets an
                existing password, which has no meaning while creating an account. */}
            {mode === "login" && (
              <div className="flex justify-end">
                <AuthQuietLink href="/forgot-password">Forgot password?</AuthQuietLink>
              </div>
            )}
          </div>

          {/* Directly below the Password field, and hidden while it is empty. */}
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
            /*
              `font-ui!` matches the fields, labels and tabs of this form. The
              unlayered `button { font-family: inherit }` rule in globals.css
              outranks the plain `font-ui` utility inside Button, so without it the
              submit label rendered in the body serif (Newsreader) while every other
              piece of chrome in the same form used Source Sans 3. Scoped to this
              call site: no other Button consumer changes.
            */
            className="w-full font-ui!"
            disabled={loading}
            aria-busy={loading}
          >
            {/*
              A spinner beside the busy label. It is sized inside the existing
              button box and coloured with `currentColor`, so neither the button's
              width nor its height changes while a request is in flight.
            */}
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
