"use client";

/**
 * Device preferences.
 *
 * These are *not* account settings: the API has no endpoint for any of them, so
 * they live in `localStorage` under one key and every surface that shows one says
 * "Saved on this device". Keeping them in a single module — read, write and the
 * document attributes they drive — is what stops the same preference from being
 * stored twice, or applied in one place and not another.
 *
 * The applied state lives on the document element, exactly like the sidebar's
 * collapsed state, so CSS can read it and so the shared time formatter can read the
 * clock format without a React context.
 */

export type TimeFormat = "12h" | "24h";
export type TextSize = "small" | "default" | "large";
export type MessageDensity = "comfortable" | "compact";
export type EnterBehavior = "send" | "newline";
export type MotionPreference = "system" | "always" | "never";

export interface Prefs {
  timeFormat: TimeFormat;
  textSize: TextSize;
  density: MessageDensity;
  enterBehavior: EnterBehavior;
  /** Whether the desktop sidebar starts collapsed. Applied on the next load. */
  sidebarStartCollapsed: boolean;
  motion: MotionPreference;
}

export const PREFS_STORAGE_KEY = "badrlink.prefs";

export const DEFAULT_PREFS: Prefs = {
  timeFormat: "12h",
  textSize: "default",
  density: "comfortable",
  enterBehavior: "send",
  sidebarStartCollapsed: false,
  motion: "system",
};

function coerce(raw: unknown): Prefs {
  const value = (raw ?? {}) as Partial<Prefs>;
  const pick = <T extends string>(candidate: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(candidate as T) ? (candidate as T) : fallback;
  return {
    timeFormat: pick(value.timeFormat, ["12h", "24h"], DEFAULT_PREFS.timeFormat),
    textSize: pick(value.textSize, ["small", "default", "large"], DEFAULT_PREFS.textSize),
    density: pick(value.density, ["comfortable", "compact"], DEFAULT_PREFS.density),
    enterBehavior: pick(value.enterBehavior, ["send", "newline"], DEFAULT_PREFS.enterBehavior),
    sidebarStartCollapsed:
      typeof value.sidebarStartCollapsed === "boolean"
        ? value.sidebarStartCollapsed
        : DEFAULT_PREFS.sidebarStartCollapsed,
    motion: pick(value.motion, ["system", "always", "never"], DEFAULT_PREFS.motion),
  };
}

export function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return coerce(JSON.parse(raw));
  } catch {
    return DEFAULT_PREFS;
  }
}

export function persistPrefs(prefs: Prefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be unavailable; the session-only value still applies.
  }
}

/**
 * Mirrors the preferences onto the document element. `data-density` and
 * `data-text-size` are read by the CSS in `globals.css`; `data-motion` overrides
 * `prefers-reduced-motion` for the app's own transitions.
 */
export function applyPrefs(prefs: Prefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.density = prefs.density;
  root.dataset.textSize = prefs.textSize;
  root.dataset.motion = prefs.motion;
  root.dataset.enterKey = prefs.enterBehavior;
}

/**
 * The app's type scale is expressed in pixel utilities, so a root `font-size` would
 * be a no-op. Scaling the shell instead is the only change that actually makes
 * "Text size" visible, and it scales the whole interface the way browser zoom does.
 */
export const TEXT_SIZE_SCALE: Record<TextSize, number> = {
  small: 0.9,
  default: 1,
  large: 1.12,
};
