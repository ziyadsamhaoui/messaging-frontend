import { apiClient } from "../apiClient";
import { AuthSession, LoginRequest, RegisterRequest, RegisterResponse, TokenResponse } from "../types";
import { decodeJwtSubject } from "../tokenStore";

export function loginRequest(body: LoginRequest) {
  return apiClient.post<TokenResponse>("/auth/login", body, { auth: false });
}

export function registerRequest(body: RegisterRequest) {
  return apiClient.post<RegisterResponse>("/auth/register", body, { auth: false });
}

export function logoutRequest(refreshToken: string) {
  return apiClient.post<void>("/auth/logout", { refreshToken });
}

export function buildSession(tokens: TokenResponse, fallbackUserId?: string): AuthSession {
  const userId = decodeJwtSubject(tokens.accessToken) ?? fallbackUserId ?? "";
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenType: tokens.tokenType ?? "Bearer",
    expiresInSeconds: tokens.expiresInSeconds ?? 0,
    expiresAt: Date.now() + (tokens.expiresInSeconds ?? 0) * 1000,
    userId,
  };
}
