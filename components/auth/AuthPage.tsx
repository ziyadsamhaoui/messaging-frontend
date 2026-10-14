"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useAuth } from "@/hooks/useAuth";
import { AuthMode } from "@/lib/authValidation";

const MODE_PATHS: Record<AuthMode, string> = {
  login: "/login",
  register: "/register",
};

/**
 * Everything `/login` and `/register` need, rendered once by the shared `(auth)`
 * layout so the card is never unmounted when the mode changes.
 */
export function AuthPage() {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // The URL is the single source of truth for the mode, so opening either address
  // directly, refreshing, or arriving via Back/Forward always renders the form
  // that address names.
  const mode: AuthMode = pathname === MODE_PATHS.register ? "register" : "login";

  /*
   * `replace` rather than `push`, so the browser Back button leaves the auth area
   * instead of walking back through every mode the visitor tried. The existing
   * query string is carried over verbatim, which is what keeps a `next` (or any
   * other redirect context) alive across a switch.
   *
   * Read straight off `window` because this only ever runs from a user
   * interaction, after hydration.
   */
  function handleModeChange(next: AuthMode) {
    const search = typeof window === "undefined" ? "" : window.location.search;
    router.replace(`${MODE_PATHS[next]}${search}`);
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
      <AuthCard mode={mode} onModeChange={handleModeChange} />
    </AuthLayout>
  );
}
