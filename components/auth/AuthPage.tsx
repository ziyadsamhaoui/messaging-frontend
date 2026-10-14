"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AuthCard, AuthMode } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useAuth } from "@/hooks/useAuth";

const MODE_PATHS: Record<AuthMode, string> = {
  login: "/login",
  register: "/register",
};

/**
 * Everything `/login` and `/register` need, so the two routes differ only by the
 * mode they open on. Keeping the shell and the session-restore gate in one place
 * is what makes the two URLs behave identically rather than drift apart.
 */
export function AuthPage({ initialMode }: { initialMode: AuthMode }) {
  const auth = useAuth();
  const router = useRouter();

  /*
   * `replace` rather than `push`, so the browser Back button leaves the auth area
   * instead of walking back through every mode the visitor tried. The existing
   * query string is carried over verbatim, which is what keeps a `next` (or any
   * other redirect context) alive across a switch.
   *
   * Read straight off `window` because this only ever runs from a user
   * interaction, after hydration.
   */
  function handleModeChange(mode: AuthMode) {
    const search = typeof window === "undefined" ? "" : window.location.search;
    router.replace(`${MODE_PATHS[mode]}${search}`);
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
    <AuthLayout>
      <AuthCard initialMode={initialMode} onModeChange={handleModeChange} />
    </AuthLayout>
  );
}
