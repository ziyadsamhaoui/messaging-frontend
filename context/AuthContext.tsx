"use client";

import { useRouter } from "next/navigation";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { refreshSession, setUnauthorizedHandler } from "../lib/apiClient";
import { buildSession, loginRequest, logoutRequest, registerRequest } from "../lib/services/auth";
import { getUser } from "../lib/services/users";
import { AuthSession, PublicUserDto, RegisterRequest } from "../lib/types";
import {
  clearSession,
  getSession,
  isSessionExpired,
  setSession,
  subscribeSession,
} from "../lib/tokenStore";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  session: AuthSession | null;
  user: PublicUserDto | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const CONTEXT_REFRESH_LEAD_MS = 60_000;
const MAX_TIMEOUT_MS = 2_147_000_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<PublicUserDto | null>(null);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setStatus("unauthenticated");
      setUser(null);
      setSessionState(null);
      router.replace("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  useEffect(
    () =>
      subscribeSession((next) => {
        setSessionState(next);
        if (!next) {
          setUser(null);
          setStatus("unauthenticated");
        }
      }),
    []
  );

  const loadProfile = useCallback(async (next: AuthSession) => {
    setSession(next);
    setSessionState(next);
    setStatus("authenticated");
    try {
      const profile = await getUser(next.userId);
      setUser(profile);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      const existing = getSession();
      if (!existing) {
        if (active) setStatus("unauthenticated");
        return;
      }
      if (isSessionExpired(existing, 5_000)) {
        const refreshed = await refreshSession();
        if (!active) return;
        if (!refreshed) {
          setStatus("unauthenticated");
          return;
        }
        await loadProfile(refreshed);
        return;
      }
      await loadProfile(existing);
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, [loadProfile]);

  useEffect(() => {
    if (status !== "authenticated" || !session || !session.expiresAt) return;
    const delay = Math.min(Math.max(session.expiresAt - Date.now() - CONTEXT_REFRESH_LEAD_MS, 0), MAX_TIMEOUT_MS);
    const timer = setTimeout(() => {
      void refreshSession();
    }, delay);
    return () => clearTimeout(timer);
  }, [status, session]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await loginRequest({ email, password });
      await loadProfile(buildSession(tokens));
    },
    [loadProfile]
  );

  const register = useCallback(
    async (input: RegisterRequest) => {
      await registerRequest(input);
      await login(input.email, input.password);
    },
    [login]
  );

  const logout = useCallback(async () => {
    const current = getSession();
    try {
      if (current?.refreshToken) {
        await logoutRequest(current.refreshToken);
      }
    } catch {
      void 0;
    }
    clearSession();
    setSessionState(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const refreshUser = useCallback(async () => {
    const current = getSession();
    if (!current) return;
    try {
      setUser(await getUser(current.userId));
    } catch {
      void 0;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, user, login, register, logout, refreshUser }),
    [status, session, user, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
