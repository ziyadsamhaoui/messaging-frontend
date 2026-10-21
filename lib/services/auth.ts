import { apiClient } from "@/lib/apiClient";
import {
  AuthSession,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  TokenResponse,
} from "@/lib/types";
import { decodeJwtSubject } from "@/lib/tokenStore";

export function loginRequest(body: LoginRequest) {
  return apiClient.post<TokenResponse>("/auth/login", body, { auth: false });
}

export function registerRequest(body: RegisterRequest) {
  return apiClient.post<RegisterResponse>("/auth/register", body, { auth: false });
}

export function logoutRequest(refreshToken: string) {
  return apiClient.post<void>("/auth/logout", { refreshToken });
}

export function forgotPasswordRequest(body: ForgotPasswordRequest) {
  return apiClient.post<void>("/auth/forgot-password", body, { auth: false });
}

export function resetPasswordRequest(body: ResetPasswordRequest) {
  return apiClient.post<void>("/auth/reset-password", body, { auth: false });
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
