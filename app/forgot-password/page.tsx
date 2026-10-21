"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AuthQuietLink, FormMessageRegion } from "@/components/auth/AuthFormParts";
import {
  AUTH_CARD_SURFACE,
  AUTH_CARD_WIDTH,
  AUTH_FIELD_CLASS,
  AuthLayout,
} from "@/components/auth/AuthLayout";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RecoveryFieldErrors, mapRecoveryError, validateEmail } from "@/lib/authValidation";
import { forgotPasswordRequest } from "@/lib/services/auth";

const EMAIL_FIELD_ID = "recovery-email";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RecoveryFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const submitLockRef = useRef(false);

  useEffect(() => {
    document.getElementById(EMAIL_FIELD_ID)?.focus();
  }, []);

  async function handleSubmit() {
    if (submitLockRef.current) return;
    setError(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }
    setFieldErrors({});

    submitLockRef.current = true;
    setLoading(true);
    try {
      await forgotPasswordRequest({ email: email.trim() });
      setSent(true);
    } catch (err) {
      const mapped = mapRecoveryError(err, "forgot");
      setFieldErrors(mapped.fieldErrors);
      setError(mapped.formError);
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <section aria-labelledby="recovery-heading" className={`${AUTH_CARD_SURFACE} ${AUTH_CARD_WIDTH}`}>
        <h1
          id="recovery-heading"
          className="font-display text-3xl font-semibold leading-tight text-[var(--color-parchment)]"
        >
          {sent ? "Check your inbox" : "Reset your password"}
        </h1>
        <p className="mt-2 font-ui text-sm text-[var(--color-text-secondary)]">
          {sent
            ? `If an account exists for ${email.trim()}, a reset link is on its way.`
            : "Enter your email and we will send you a link to choose a new password."}
        </p>

        {sent ? (
          <div className="mt-6 flex flex-col gap-4">
            <p className="font-ui text-sm text-[var(--color-parchment)]">
              The link can only be used once, so open it as soon as it arrives.
            </p>
            <Link
              href="/login"
              className={buttonClasses({ variant: "primary", tone: "dark", size: "lg", className: "w-full font-ui!" })}
            >
              Back to sign in
            </Link>
          </div>
        ) : (
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
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              onBlur={() => {
                if (email) setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }));
              }}
              placeholder="you@example.com"
              error={fieldErrors.email}
              disabled={loading}
              autoComplete="email"
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
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center">
          <AuthQuietLink href="/login">Back to sign in</AuthQuietLink>
        </p>
      </section>
    </AuthLayout>
  );
}
