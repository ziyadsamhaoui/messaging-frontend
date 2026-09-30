"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

interface AuthState {
  token: string | null;
  username: string | null;
  userId: number | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, username: string, userId: number) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "messaging.auth";

function loadAuthFromStorage(): AuthState {
  if (typeof window === "undefined") {
    return { token: null, username: null, userId: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, username: null, userId: null };
    const parsed = JSON.parse(raw) as AuthState;
    return {
      token: parsed.token ?? null,
      username: parsed.username ?? null,
      userId: parsed.userId ?? null,
    };
  } catch {
    return { token: null, username: null, userId: null };
  }
}

function persistAuth(next: AuthState) {
  if (typeof window === "undefined") return;
  if (!next.token) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => loadAuthFromStorage());

  const value = useMemo<AuthContextValue>(
    () => ({
      ...auth,
      login: (token, username, userId) => {
        const next = { token, username, userId };
        setAuth(next);
        persistAuth(next);
      },
      logout: () => {
        const next = { token: null, username: null, userId: null };
        setAuth(next);
        persistAuth(next);
      },
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function getAuthHeader(token: string | null) {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

