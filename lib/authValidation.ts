import { ApiError, toApiError } from "./errors";

export type AuthMode = "login" | "register";

export interface AuthFieldErrors {
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

export const AUTH_RULES = {
  emailMaxLength: 255,
  usernameMinLength: 3,
  usernameMaxLength: 50,
  usernamePattern: /^[a-zA-Z0-9._-]+$/,
  passwordMinLength: 8,
  passwordMaxLength: 128,
} as const;

export const PASSWORD_RULE_HINT = `Use at least ${AUTH_RULES.passwordMinLength} characters.`;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

export interface AuthValues {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return "Email address is required.";
  if (value.length > AUTH_RULES.emailMaxLength) {
    return `Email address must be ${AUTH_RULES.emailMaxLength} characters or fewer.`;
  }
  if (!EMAIL_PATTERN.test(value)) return "Enter a valid email address.";
  return undefined;
}

export function validateField(
  field: keyof AuthValues,
  values: AuthValues,
  mode: AuthMode
): string | undefined {
  switch (field) {
    case "email": {
      return validateEmail(values.email);
    }
    case "username": {
      if (mode !== "register") return undefined;
      const username = values.username.trim();
      if (!username) return "Username is required.";
      if (username.length < AUTH_RULES.usernameMinLength) {
        return `Username must be at least ${AUTH_RULES.usernameMinLength} characters.`;
      }
      if (username.length > AUTH_RULES.usernameMaxLength) {
        return `Username must be ${AUTH_RULES.usernameMaxLength} characters or fewer.`;
      }
      if (!AUTH_RULES.usernamePattern.test(username)) {
        return "Username can only use letters, numbers, dots, underscores and hyphens.";
      }
      return undefined;
    }
    case "password": {
      if (!values.password) return "Password is required.";
      if (mode !== "register") return undefined;
      if (values.password.length < AUTH_RULES.passwordMinLength) {
        return `Password must be at least ${AUTH_RULES.passwordMinLength} characters.`;
      }
      if (values.password.length > AUTH_RULES.passwordMaxLength) {
        return `Password must be ${AUTH_RULES.passwordMaxLength} characters or fewer.`;
      }
      return undefined;
    }
    case "confirmPassword": {
      if (mode !== "register") return undefined;
      if (!values.confirmPassword) return "Please confirm your password.";
      if (values.confirmPassword !== values.password) return "Passwords do not match.";
      return undefined;
    }
    default:
      return undefined;
  }
}

export function validateForm(values: AuthValues, mode: AuthMode): AuthFieldErrors {
  const fields: Array<keyof AuthValues> =
    mode === "register" ? ["email", "username", "password", "confirmPassword"] : ["email", "password"];

  const errors: AuthFieldErrors = {};
  for (const field of fields) {
    const message = validateField(field, values, mode);
    if (message) errors[field] = message;
  }
  return errors;
}

const FIELD_KEYS: Array<keyof AuthFieldErrors> = ["email", "username", "password", "confirmPassword"];

function formatLockoutTime(message: string): string | null {
  const match = message.match(/(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)/);
  if (!match) return null;
  const at = new Date(match[1]);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export interface RecoveryFieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export type RecoveryPhase = "forgot" | "reset";

export interface RecoveryError {
  fieldErrors: RecoveryFieldErrors;
  formError: string | null;
  invalidLink?: boolean;
}

export function validateNewPassword(password: string): string | undefined {
  if (!password) return "Password is required.";
  if (password.length < AUTH_RULES.passwordMinLength) {
    return `Password must be at least ${AUTH_RULES.passwordMinLength} characters.`;
  }
  if (password.length > AUTH_RULES.passwordMaxLength) {
    return `Password must be ${AUTH_RULES.passwordMaxLength} characters or fewer.`;
  }
  return undefined;
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): string | undefined {
  if (!confirmPassword) return "Please confirm your password.";
  if (confirmPassword !== password) return "Passwords do not match.";
  return undefined;
}

const RECOVERY_FALLBACK = "Something went wrong. Please try again.";

export function mapRecoveryError(error: unknown, phase: RecoveryPhase): RecoveryError {
  const apiError: ApiError = toApiError(error);
  const fieldErrors: RecoveryFieldErrors = {};
  const emailMessage = apiError.fieldErrors.email;
  const passwordMessage = apiError.fieldErrors.password ?? apiError.fieldErrors.newPassword;
  if (emailMessage) fieldErrors.email = emailMessage;
  if (passwordMessage) fieldErrors.password = passwordMessage;
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, formError: null };

  if (phase === "reset" && (apiError.status === 401 || apiError.kind === "unauthenticated")) {
    return {
      fieldErrors: {},
      formError: "This reset link is no longer valid. Request a new one to continue.",
      invalidLink: true,
    };
  }

  if (apiError.status === 502) {
    return {
      fieldErrors: {},
      formError: "We could not send the reset email right now. Please try again shortly.",
    };
  }

  switch (apiError.kind) {
    case "rate-limit":
      return { fieldErrors: {}, formError: apiError.message.trim() || "Too many attempts. Please wait a moment and try again." };
    case "validation":
      return phase === "reset"
        ? {
            fieldErrors: {},
            formError: `Your new password must be between ${AUTH_RULES.passwordMinLength} and ${AUTH_RULES.passwordMaxLength} characters.`,
          }
        : { fieldErrors: {}, formError: RECOVERY_FALLBACK };
    case "unavailable":
      return { fieldErrors: {}, formError: "The service is temporarily unavailable. Please try again." };
    default:
      return { fieldErrors: {}, formError: RECOVERY_FALLBACK };
  }
}

export function mapAuthError(
  error: unknown,
  mode: AuthMode
): { fieldErrors: AuthFieldErrors; formError: string | null } {
  const apiError: ApiError = toApiError(error);
  const fieldErrors: AuthFieldErrors = {};

  for (const key of FIELD_KEYS) {
    const message = apiError.fieldErrors[key];
    if (message) fieldErrors[key] = message;
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, formError: null };

  if (apiError.status === 409 && mode === "register") {
    return { fieldErrors: { email: "That email address is already registered." }, formError: null };
  }

  if (apiError.status === 423) {
    const at = formatLockoutTime(apiError.message);
    return {
      fieldErrors: {},
      formError: at
        ? `Too many failed attempts. Try again after ${at}.`
        : "Too many failed attempts. Please try again later.",
    };
  }

  switch (apiError.kind) {
    case "unauthenticated":
      return {
        fieldErrors: {},
        formError:
          mode === "login" ? "Email or password is incorrect." : "Please sign in again to continue.",
      };
    case "rate-limit":
      return { fieldErrors: {}, formError: "Too many attempts. Please wait a moment and try again." };
    case "unavailable":
      return { fieldErrors: {}, formError: "The service is temporarily unavailable. Please try again." };
    default:
      return { fieldErrors: {}, formError: apiError.message };
  }
}
