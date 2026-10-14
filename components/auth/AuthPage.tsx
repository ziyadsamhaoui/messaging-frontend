"use client";

import React from "react";
import { AuthCard, AuthMode } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useAuth } from "@/hooks/useAuth";

/**
 * Everything `/login` and `/register` need, so the two routes differ only by the
 * mode they open on. Keeping the shell and the session-restore gate in one place
 * is what makes the two URLs behave identically rather than drift apart.
 */
export function AuthPage({ initialMode }: { initialMode: AuthMode }) {
  const auth = useAuth();

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
    <AuthLayout>
      <AuthCard initialMode={initialMode} />
    </AuthLayout>
  );
}
