"use client";

import { useCallback, useEffect, useState } from "react";
import { PushState, readPushState } from "@/lib/push";

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
