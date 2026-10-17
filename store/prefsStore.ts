"use client";

import { create } from "zustand";
import {
  applyPrefs,
  DEFAULT_PREFS,
  persistPrefs,
  Prefs,
  readPrefs,
} from "@/lib/prefs";
import { setClockFormat } from "@/lib/time";

interface PrefsState extends Prefs {
  /** Applies one key and persists the whole object; every editor calls this. */
  set: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  reset: () => void;
}

function initial(): Prefs {
  const prefs = readPrefs();
  // The formatter reads the clock format synchronously, so it is seeded here rather
  // than in an effect: the first render must already use the stored format.
  setClockFormat(prefs.timeFormat);
  return prefs;
}

const initialPrefs = initial();

export const usePrefsStore = create<PrefsState>((set, get) => ({
  ...initialPrefs,
  set: (key, value) => {
    const next: Prefs = { ...get(), [key]: value };
    persistPrefs(next);
    applyPrefs(next);
    if (key === "timeFormat") setClockFormat(next.timeFormat);
    set({ [key]: value } as Pick<PrefsState, typeof key>);
  },
  reset: () => {
    persistPrefs(DEFAULT_PREFS);
    applyPrefs(DEFAULT_PREFS);
    setClockFormat(DEFAULT_PREFS.timeFormat);
    set({ ...DEFAULT_PREFS });
  },
}));

/** Called once by the shell so the stored preferences are on the document. */
export function applyStoredPrefs() {
  applyPrefs(readPrefs());
}
