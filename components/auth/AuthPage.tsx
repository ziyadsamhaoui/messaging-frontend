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

export function AuthPage() {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const mode: AuthMode = pathname === MODE_PATHS.register ? "register" : "login";

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
