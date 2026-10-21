"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthQuietLink, FormMessageRegion } from "@/components/auth/AuthFormParts";
import {
  AUTH_CARD_SURFACE,
  AUTH_CARD_WIDTH,
  AUTH_FIELD_CLASS,
  AuthLayout,
} from "@/components/auth/AuthLayout";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { Button, buttonClasses } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/PasswordField";
import {
  RecoveryFieldErrors,
  mapRecoveryError,
  validateNewPassword,
  validatePasswordConfirmation,
} from "@/lib/authValidation";
import { resetPasswordRequest } from "@/lib/services/auth";

const NEW_PASSWORD_FIELD_ID = "new-password";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordShell status="Checking your reset link…" />}>
      <ResetPasswordScreen />
    </Suspense>
  );
}

function ResetPasswordShell({
  title = "Choose a new password",
  subtitle = "Set a new password for your BadrLink account.",
  status,
  children,
}: {
  title?: string;
  subtitle?: string;
  status?: string;
  children?: React.ReactNode;
}) {
  return (
    <AuthLayout>
      <section aria-labelledby="recovery-heading" className={`${AUTH_CARD_SURFACE} ${AUTH_CARD_WIDTH}`}>
        <h1
          id="recovery-heading"
          className="font-display text-3xl font-semibold leading-tight text-[var(--color-parchment)]"
        >
          {title}
        </h1>
        <p className="mt-2 font-ui text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
        {status ? (
          <p role="status" className="mt-6 min-h-[180px] font-ui text-sm text-[var(--color-text-secondary)]">
            {status}
          </p>
        ) : (
          children
        )}
      </section>
    </AuthLayout>
  );
}

function ResetPasswordScreen() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RecoveryFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<"done" | "invalid-token" | null>(null);
  const submitLockRef = useRef(false);

  const invalidToken = outcome === "invalid-token" || !token;
  const showForm = outcome === null && Boolean(token);

  useEffect(() => {
    if (showForm) document.getElementById(NEW_PASSWORD_FIELD_ID)?.focus();
  }, [showForm]);

  function handlePasswordChange(value: string) {
    setPassword(value);
    setError(null);
    setFieldErrors((prev) => {
      const next = { ...prev, password: undefined };
      if (confirmPassword) {
        next.confirmPassword = value === confirmPassword ? undefined : "Passwords do not match.";
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (submitLockRef.current) return;
    setError(null);

    const errors: RecoveryFieldErrors = {
      password: validateNewPassword(password),
      confirmPassword: validatePasswordConfirmation(password, confirmPassword),
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    submitLockRef.current = true;
    setLoading(true);
    try {
      await resetPasswordRequest({ token, newPassword: password });
      setOutcome("done");
    } catch (err) {
      const mapped = mapRecoveryError(err, "reset");
      setFieldErrors(mapped.fieldErrors);
      setError(mapped.formError);
      if (mapped.invalidLink) setOutcome("invalid-token");
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  }

  if (outcome === "done") {
    return (
      <ResetPasswordShell
        title="Password updated"
        subtitle="Your password has been changed. Sign in with it to continue."
      >
        <div className="mt-6 flex flex-col gap-4">
          <Link
            href="/login"
            className={buttonClasses({ variant: "primary", tone: "dark", size: "lg", className: "w-full font-ui!" })}
          >
            Back to sign in
          </Link>
        </div>
      </ResetPasswordShell>
    );
  }

  if (invalidToken) {
    return (
      <ResetPasswordShell
        title="Reset link not valid"
        subtitle="This link cannot be used. Request a new one to choose a new password."
      >
        <div className="mt-6 flex flex-col gap-4">
          <FormMessageRegion
            message={error ?? "This reset link is incomplete or has already been used."}
          />
          <Link
            href="/forgot-password"
            className={buttonClasses({ variant: "primary", tone: "dark", size: "lg", className: "w-full font-ui!" })}
          >
            Request a new link
          </Link>
          <p className="text-center">
            <AuthQuietLink href="/login">Back to sign in</AuthQuietLink>
          </p>
        </div>
      </ResetPasswordShell>
    );
  }

  return (
    <ResetPasswordShell>
      <form
        noValidate
        className="mt-6 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <PasswordField
          id={NEW_PASSWORD_FIELD_ID}
          label="New password"
          value={password}
          onChange={(event) => handlePasswordChange(event.target.value)}
          onBlur={() => {
            if (password) {
              setFieldErrors((prev) => ({ ...prev, password: validateNewPassword(password) }));
            }
          }}
          error={fieldErrors.password}
          disabled={loading}
          autoComplete="new-password"
          className={AUTH_FIELD_CLASS}
        />

        <PasswordStrengthMeter password={password} />

        <PasswordField
          label="Confirm password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setError(null);
            setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          onBlur={() => {
            if (confirmPassword) {
              setFieldErrors((prev) => ({
                ...prev,
                confirmPassword: validatePasswordConfirmation(password, confirmPassword),
              }));
            }
          }}
          error={fieldErrors.confirmPassword}
          disabled={loading}
          autoComplete="new-password"
          className={AUTH_FIELD_CLASS}
        />

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
          {loading ? "Saving…" : "Set new password"}
        </Button>
      </form>

      <p className="mt-4 text-center">
        <AuthQuietLink href="/login">Back to sign in</AuthQuietLink>
      </p>
    </ResetPasswordShell>
  );
}
