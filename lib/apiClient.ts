import { API_GATEWAY_URL } from "./env";
import { ApiError, normalizeError, toApiError } from "./errors";
import { AuthSession, ErrorResponse, TokenResponse } from "./types";
import { clearSession, decodeJwtSubject, getSession, setSession } from "./tokenStore";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal | null;
  timeoutMs?: number;
  auth?: boolean;
  skipRefresh?: boolean;
}

const DEFAULT_TIMEOUT_MS = 15000;

let refreshInFlight: Promise<AuthSession | null> | null = null;

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

function withTimeout(signal: AbortSignal | null | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromParent = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", abortFromParent, { once: true });
    }
  }
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abortFromParent);
    },
  };
}

async function readErrorBody(response: Response): Promise<Partial<ErrorResponse> | null> {
  try {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text) as Partial<ErrorResponse>;
  } catch {
    return null;
  }
}

async function readSuccessBody<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 205) return null as T;
  const contentLength = response.headers.get("content-length");
  if (contentLength === "0") return null as T;
  const text = await response.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

function triggerUnauthorized() {
  clearSession();
  if (onUnauthorized) {
    onUnauthorized();
    return;
  }
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

export async function refreshSession(): Promise<AuthSession | null> {
  if (refreshInFlight) return refreshInFlight;

  const existing = getSession();
  if (!existing?.refreshToken) {
    clearSession();
    return null;
  }

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_GATEWAY_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refreshToken: existing.refreshToken }),
      });

      if (!response.ok) {
        clearSession();
        return null;
      }

      const tokens = (await readSuccessBody<TokenResponse>(response)) as TokenResponse | null;
      if (!tokens?.accessToken || !tokens.refreshToken) {
        clearSession();
        return null;
      }

      const next: AuthSession = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType ?? "Bearer",
        expiresInSeconds: tokens.expiresInSeconds ?? 0,
        expiresAt: Date.now() + (tokens.expiresInSeconds ?? 0) * 1000,
        userId: decodeJwtSubject(tokens.accessToken) ?? existing.userId,
      };
      setSession(next);
      return next;
    } catch {
      clearSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function performFetch(
  path: string,
  options: ApiRequestOptions,
  session: AuthSession | null
): Promise<Response> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.auth !== false && session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  const { signal, dispose } = withTimeout(options.signal, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    return await fetch(`${API_GATEWAY_URL}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal,
    });
  } finally {
    dispose();
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const session = options.auth === false ? null : getSession();

  let response: Response;
  try {
    response = await performFetch(path, options, session);
  } catch (error) {
    throw toApiError(error);
  }

  if (response.status === 401 && options.auth !== false && !options.skipRefresh && session?.refreshToken) {
    const refreshed = await refreshSession();
    if (refreshed) {
      try {
        response = await performFetch(path, { ...options, skipRefresh: true }, refreshed);
      } catch (error) {
        throw toApiError(error);
      }
    } else {
      triggerUnauthorized();
      throw new ApiError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Your session has expired. Please sign in again.",
        kind: "unauthenticated",
      });
    }
  }

  if (!response.ok) {
    const body = await readErrorBody(response);
    const apiError = normalizeError(response.status, body, response.headers.get("Retry-After"));
    if (apiError.status === 401 && options.auth !== false) {
      triggerUnauthorized();
    }
    throw apiError;
  }

  return readSuccessBody<T>(response);
}

export const apiClient = {
  get<T>(path: string, options: ApiRequestOptions = {}) {
    return apiRequest<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, body?: unknown, options: ApiRequestOptions = {}) {
    return apiRequest<T>(path, { ...options, method: "POST", body });
  },
  put<T>(path: string, body?: unknown, options: ApiRequestOptions = {}) {
    return apiRequest<T>(path, { ...options, method: "PUT", body });
  },
  patch<T>(path: string, body?: unknown, options: ApiRequestOptions = {}) {
    return apiRequest<T>(path, { ...options, method: "PATCH", body });
  },
  delete<T>(path: string, options: ApiRequestOptions = {}) {
    return apiRequest<T>(path, { ...options, method: "DELETE" });
  },
};
