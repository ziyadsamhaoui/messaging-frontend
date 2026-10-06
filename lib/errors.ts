import { ErrorFrame, ErrorResponse } from "./types";

export type ApiErrorKind =
  | "blocked"
  | "rate-limit"
  | "invitation-expired"
  | "unavailable"
  | "unauthenticated"
  | "forbidden"
  | "validation"
  | "not-found"
  | "generic";

const BLOCKED_CODES = new Set(["BLOCKED_RELATIONSHIP", "USER_BLOCKED", "RELATIONSHIP_BLOCKED"]);

const RATE_LIMIT_CODES = new Set(["RATE_LIMITED", "RATE_LIMIT_EXCEEDED"]);

const INVITATION_EXPIRED_CODES = new Set(["INVITATION_EXPIRED"]);

const UNAVAILABLE_CODES = new Set([
  "UPSTREAM_UNAVAILABLE",
  "DEPENDENCY_UNAVAILABLE",
  "RATE_LIMITER_UNAVAILABLE",
  "SERVICE_UNAVAILABLE",
]);

const UNAUTHENTICATED_CODES = new Set(["UNAUTHENTICATED"]);

const FORBIDDEN_CODES = new Set(["FORBIDDEN", "ROOM_ACCESS_DENIED", "PARTICIPANT_MUTED"]);

const VALIDATION_CODES = new Set([
  "VALIDATION_FAILED",
  "MALFORMED_REQUEST_BODY",
  "INVALID_REQUEST_PARAMETER",
  "INVALID_REQUEST",
]);

const NOT_FOUND_CODES = new Set([
  "NOT_FOUND",
  "ROOM_NOT_FOUND",
  "MESSAGE_NOT_FOUND",
  "USER_NOT_FOUND",
  "PARTICIPANT_NOT_FOUND",
  "INVITATION_NOT_FOUND",
]);

export function classifyError(status: number, code: string): ApiErrorKind {
  if (BLOCKED_CODES.has(code)) return "blocked";
  if (RATE_LIMIT_CODES.has(code) || status === 429) return "rate-limit";
  if (INVITATION_EXPIRED_CODES.has(code)) return "invitation-expired";
  if (UNAVAILABLE_CODES.has(code) || status === 503) return "unavailable";
  if (UNAUTHENTICATED_CODES.has(code) || status === 401) return "unauthenticated";
  if (FORBIDDEN_CODES.has(code) || status === 403) return "forbidden";
  if (VALIDATION_CODES.has(code) || status === 400 || status === 422) return "validation";
  if (NOT_FOUND_CODES.has(code) || status === 404) return "not-found";
  return "generic";
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly kind: ApiErrorKind;
  readonly fieldErrors: Record<string, string>;
  readonly path?: string;
  readonly retryAfterSeconds?: number;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    kind: ApiErrorKind;
    fieldErrors?: Record<string, string>;
    path?: string;
    retryAfterSeconds?: number;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.code = params.code;
    this.kind = params.kind;
    this.fieldErrors = params.fieldErrors ?? {};
    this.path = params.path;
    this.retryAfterSeconds = params.retryAfterSeconds;
  }

  get isBlocked() {
    return this.kind === "blocked";
  }

  get isRateLimited() {
    return this.kind === "rate-limit";
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

function parseRetryAfter(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const seconds = Number(headerValue);
  return Number.isFinite(seconds) ? seconds : undefined;
}

export function normalizeError(
  status: number,
  body: Partial<ErrorResponse> | null,
  retryAfterHeader?: string | null
): ApiError {
  const code = (body?.code || body?.error || `HTTP_${status}`).toString();
  const message = body?.message || `Request failed with status ${status}`;
  return new ApiError({
    status,
    code,
    message,
    kind: classifyError(status, code),
    fieldErrors: body?.fieldErrors ?? {},
    path: body?.path,
    retryAfterSeconds: parseRetryAfter(retryAfterHeader ?? null),
  });
}

export function normalizeStompError(raw: unknown): ApiError {
  let status = 500;
  let code = "REALTIME_ERROR";
  let message = "Realtime connection error";

  if (typeof raw === "string") {
    const parsed = safeParse(raw);
    if (parsed) return normalizeStompError(parsed);
    message = raw || message;
    return new ApiError({ status, code, message, kind: classifyError(status, code) });
  }

  if (raw && typeof raw === "object") {
    const frame = raw as Partial<ErrorFrame> & { error?: string };
    status = typeof frame.status === "number" ? frame.status : status;
    code = frame.code || frame.error || code;
    message = frame.message || message;
  }

  return new ApiError({ status, code, message, kind: classifyError(status, code) });
}

export function toApiError(value: unknown): ApiError {
  if (isApiError(value)) return value;
  if (value instanceof Error) {
    return new ApiError({ status: 0, code: "CLIENT_ERROR", message: value.message, kind: "generic" });
  }
  return new ApiError({ status: 0, code: "CLIENT_ERROR", message: "Something went wrong", kind: "generic" });
}

export function errorMessage(error: unknown): string {
  const apiError = toApiError(error);
  switch (apiError.kind) {
    case "blocked":
      return "This conversation is blocked. Messaging is disabled.";
    case "rate-limit":
      return "You are sending messages too fast. Please wait a moment.";
    case "invitation-expired":
      return "This invitation has expired.";
    case "unavailable":
      return "The service is temporarily unavailable. Retrying shortly.";
    case "unauthenticated":
      return "Your session has expired. Please sign in again.";
    default:
      return apiError.message;
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
