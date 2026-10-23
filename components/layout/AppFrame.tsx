"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAppRealtime } from "@/hooks/useAppRealtime";
import { parseAppRoute } from "@/lib/appRoute";
import { registerServiceWorker } from "@/lib/push";
import { Rail } from "./Rail";
import { MobileNav } from "./MobileNav";
import { SECTION_PANEL_HEADING_ID } from "./SectionPanel";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const route = useMemo(() => parseAppRoute(pathname), [pathname]);
  const authenticated = auth.status === "authenticated";

  useAppRealtime(
    authenticated ? auth.session?.userId ?? null : null,
    authenticated ? auth.session?.accessToken ?? null : null
  );

  useEffect(() => {
    if (auth.status === "unauthenticated") {
      router.replace("/login");
    }
  }, [auth.status, router]);

  useEffect(() => {
    if (!authenticated) return;
    void registerServiceWorker();
  }, [authenticated]);

  const destinationRef = useRef<string | null>(null);
  const destinationKey = route.isSettings ? "settings" : route.destination;
  useEffect(() => {
    if (destinationRef.current === null) {
      destinationRef.current = destinationKey;
      return;
    }
    if (destinationRef.current === destinationKey) return;
    destinationRef.current = destinationKey;
    document.getElementById(SECTION_PANEL_HEADING_ID)?.focus({ preventScroll: true });
  }, [destinationKey]);

  if (!authenticated) {
    return (
      <div className="flex h-dvh items-center justify-center font-ui">
        <div className="flex flex-col items-center gap-4">
          <div
            aria-hidden="true"
            className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-sage)] border-t-transparent"
          />
          <p className="font-ui text-sm text-[var(--app-rail-text)]">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell-root flex h-dvh w-full flex-col overflow-hidden bg-[var(--app-panel)] font-ui md:flex-row">
      <a
        href="#main-pane"
        className="focus-ring absolute left-3 top-3 z-[60] -translate-y-[200%] rounded-[var(--radius-control)] bg-[var(--app-pane-raised)] px-3 py-2 font-ui text-sm font-medium text-[var(--app-pane-text)] shadow-lg transition-transform duration-150 focus:translate-y-0 motion-reduce:transition-none"
      >
        Skip to main content
      </a>
      <Rail route={route} />
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
      <MobileNav route={route} />
    </div>
  );
}
