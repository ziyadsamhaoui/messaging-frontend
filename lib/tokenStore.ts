import { AuthSession } from "./types";

const STORAGE_KEY = "badrlink.auth.session";

type SessionListener = (session: AuthSession | null) => void;

let current: AuthSession | null = null;
let hydrated = false;
const listeners = new Set<SessionListener>();

function readFromStorage(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.userId) return null;
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      tokenType: parsed.tokenType ?? "Bearer",
      expiresInSeconds: parsed.expiresInSeconds ?? 0,
      expiresAt: parsed.expiresAt ?? 0,
      userId: parsed.userId,
    };
  } catch {
    return null;
  }
}

function hydrate() {
  if (hydrated) return;
  current = readFromStorage();
  hydrated = true;
}

function persist(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function notify() {
  listeners.forEach((listener) => listener(current));
}

export function getSession(): AuthSession | null {
  hydrate();
  return current;
}

export function setSession(session: AuthSession | null) {
  hydrate();
  current = session;
  persist(session);
  notify();
}

export function clearSession() {
  setSession(null);
}

export function subscribeSession(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isSessionExpired(session: AuthSession, skewMs = 0): boolean {
  if (!session.expiresAt) return false;
  return session.expiresAt - skewMs <= Date.now();
}

export function decodeJwtSubject(token: string): string | null {
  const payload = decodeJwtPayload(token);
  return typeof payload?.sub === "string" ? payload.sub : null;
}

export function decodeJwtRole(token: string): string | null {
  const payload = decodeJwtPayload(token);
  return typeof payload?.role === "string" ? payload.role : null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = window.atob(padded);
    const json = decodeURIComponent(
      decoded
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
