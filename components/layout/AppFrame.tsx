"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAppRealtime } from "@/hooks/useAppRealtime";
import { parseAppRoute } from "@/lib/appRoute";
import { registerServiceWorker } from "@/lib/push";
import { applyStoredPrefs } from "@/store/prefsStore";
import { Rail } from "./Rail";
import { SECTION_PANEL_HEADING_ID } from "./SectionPanel";

/**
 * The authenticated shell.
 *
 * It lives in the route group's layout rather than in a page, which is what makes
 * the four zones a shell: the rail, the socket and the user-scoped realtime
 * subscriptions stay mounted while the destinations and the open conversation
 * change underneath them.
 *
 * Layout: `h-dvh` on the root and `min-h-0` on every zone, so each zone scrolls on
 * its own and the document itself never scrolls.
 */
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

  /*
   * The device preferences (clock format, density, text size, motion) are mirrored
   * onto the document element once the shell mounts, so the first authenticated paint
   * already reflects them. The store seeds the time formatter at import time, which is
   * why rows and bubbles can read it synchronously.
   */
  useEffect(() => {
    applyStoredPrefs();
  }, []);

  /*
   * Moving focus to the panel heading when the *destination* changes, and only
   * then: switching conversations inside one destination must not pull focus out
   * of the list the user is navigating with the keyboard. The first run is skipped
   * so loading the app does not steal focus.
   */
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
    /*
     * `font-ui` on the shell root, not on `body`.
     *
     * The base stylesheet sets `body { font-family: var(--font-body) }` — a serif — and
     * `input, textarea, button { font-family: inherit }`, which is why placeholders,
     * typed text and every button in the app screen rendered in serif while the labels
     * beside them rendered in the interface sans. The fix belongs on the app's own root
     * rather than on `body`, because the landing, login and register pages are painted
     * on the same `body` and must keep their serif voice. Font-family inherits, so one
     * declaration here covers the rail, every panel, both panes and every control that
     * did not already set its own face.
     *
     * The single exception is the sidebar wordmark, which carries `font-display` itself.
     */
    <div className="app-shell-root flex h-dvh w-full overflow-hidden bg-[var(--app-panel)] font-ui">
      <a
        href="#main-pane"
        className="focus-ring absolute left-3 top-3 z-[60] -translate-y-[200%] rounded-[var(--radius-control)] bg-[var(--app-pane-raised)] px-3 py-2 font-ui text-sm font-medium text-[var(--app-pane-text)] shadow-lg transition-transform duration-150 focus:translate-y-0 motion-reduce:transition-none"
      >
        Skip to main content
      </a>
      <Rail route={route} />
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}
