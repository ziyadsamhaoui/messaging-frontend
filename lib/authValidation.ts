import { ApiError, toApiError } from "./errors";

export type AuthMode = "login" | "register";

export interface AuthFieldErrors {
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

/*
 * These are the Auth service's own constraints, not invented here. They mirror
 * `dto/AuthRequests.java`:
 *
 *   RegisterRequest : email    @NotBlank @Email @Size(max = 255)
 *                     username @NotBlank @Size(min = 3, max = 50)
 *                              @Pattern("^[a-zA-Z0-9._-]+$")
 *                     password @NotBlank @Size(min = 8, max = 128)
 *   LoginRequest    : email    @NotBlank @Email
 *                     password @NotBlank
 *
 * Sign-in deliberately does NOT apply the registration length rule: the service
 * only requires a non-blank password there, and enforcing 8 characters on the way
 * in would lock out accounts whose password predates the rule.
 */
export const AUTH_RULES = {
  emailMaxLength: 255,
  usernameMinLength: 3,
  usernameMaxLength: 50,
  usernamePattern: /^[a-zA-Z0-9._-]+$/,
  passwordMinLength: 8,
  passwordMaxLength: 128,
} as const;

/** The one-line rule shown with the strength meter on registration. */
export const PASSWORD_RULE_HINT = `Use at least ${AUTH_RULES.passwordMinLength} characters.`;

/**
 * Deliberately looser than a "strict" email regex: `@Email` only needs a local
 * part, an `@` and a domain, so this must not reject an address the service
 * would accept.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

export interface AuthValues {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export function validateField(
  field: keyof AuthValues,
  values: AuthValues,
  mode: AuthMode
): string | undefined {
  switch (field) {
    case "email": {
      const email = values.email.trim();
      if (!email) return "Email address is required.";
      if (email.length > AUTH_RULES.emailMaxLength) {
        return `Email address must be ${AUTH_RULES.emailMaxLength} characters or fewer.`;
      }
      if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
      return undefined;
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

/** Every rule at once, for the submit path. */
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

/** `<input type="datetime-local">`-free, locale-aware time for the lockout message. */
function formatLockoutTime(message: string): string | null {
  const match = message.match(/(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)/);
  if (!match) return null;
  const at = new Date(match[1]);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Turns a thrown value into what the form should show: field-level messages, a
 * single form-level message, or both.
 *
 * The Auth service reports no `fieldErrors` (only the chat service does), so most
 * failures are form-level. Where the status identifies exactly one field — a
 * registration conflict is always the email — the message is attached there
 * instead of floating above the button.
 */
export function mapAuthError(
  error: unknown,
  mode: AuthMode
): { fieldErrors: AuthFieldErrors; formError: string | null } {
  const apiError: ApiError = toApiError(error);
  const fieldErrors: AuthFieldErrors = {};

  // Honour explicit field errors if a response ever carries them, rather than
  // guessing a field from prose.
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
      // The service deliberately answers bad credentials with one generic message,
      // so neither the client nor the copy may reveal which of the two was wrong.
      return {
        fieldErrors: {},
        formError:
          mode === "login" ? "Email or password is incorrect." : "Please sign in again to continue.",
      };
    case "rate-limit":
      // The gateway answers 429 with X-RateLimit-* headers and NO message body, so
      // there is no server-provided retry text to show and no duration to quote.
      return { fieldErrors: {}, formError: "Too many attempts. Please wait a moment and try again." };
    case "unavailable":
      return { fieldErrors: {}, formError: "The service is temporarily unavailable. Please try again." };
    default:
      return { fieldErrors: {}, formError: apiError.message };
  }
}
