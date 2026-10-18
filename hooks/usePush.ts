"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collectPushDiagnostics,
  PushDiagnostic,
  PushState,
  readPushState,
} from "@/lib/push";

export interface PushStatus {
  state: PushState;
  permission: NotificationPermission | "unsupported";
  hasSubscription: boolean;
  endpoint: string | null;
  ready: boolean;
  refresh: () => Promise<void>;
}

const UNKNOWN = {
  state: "not-enabled" as PushState,
  permission: "default" as NotificationPermission | "unsupported",
  hasSubscription: false,
  endpoint: null,
};

/**
 * The browser's own answer about push on this device.
 *
 * It is read from the APIs rather than kept in component state, so the label and the
 * control can never disagree — the state that shipped before this could say
 * "Subscribed" while the enable button was disabled.
 *
 * The reads publish from an async callback rather than synchronously in the effect
 * body: `readPushState` touches the Service Worker and `PushManager`, and rendering a
 * "checking" frame first is both cheaper and honest about the fact that the answer is
 * not available at first paint.
 */
export function usePushStatus(pollMs = 0): PushStatus {
  const [value, setValue] = useState<Omit<PushStatus, "refresh">>({ ...UNKNOWN, ready: false });

  const refresh = useCallback(async () => {
    const result = await readPushState();
    setValue({ ...result, ready: true });
  }, []);

  useEffect(() => {
    let live = true;
    const apply = (result: Awaited<ReturnType<typeof readPushState>>) => {
      if (live) setValue({ ...result, ready: true });
    };

    void readPushState().then(apply);
    const timer = pollMs
      ? setInterval(() => {
          void readPushState().then(apply);
        }, pollMs)
      : null;

    return () => {
      live = false;
      if (timer) clearInterval(timer);
    };
  }, [pollMs]);

  return { ...value, refresh };
}

/** The live checks shown in the push editor's Diagnostics section. */
export function usePushDiagnostics(active: boolean) {
  const [checks, setChecks] = useState<PushDiagnostic[] | null>(null);

  const run = useCallback(async () => {
    setChecks(await collectPushDiagnostics());
  }, []);

  useEffect(() => {
    if (!active) return;
    let live = true;
    void collectPushDiagnostics().then((next) => {
      if (live) setChecks(next);
    });
    return () => {
      live = false;
    };
  }, [active]);

  return { checks, run };
}
