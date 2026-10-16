"use client";

import React, { useMemo } from "react";
import { AUTH_RULES, PASSWORD_RULE_HINT } from "@/lib/authValidation";

/*
 * Four levels for the meter's four segments. The written label — not the hue — is
 * what carries the meaning, so strength is never communicated by colour alone.
 *
 * No new colour is introduced here, but the level that reaches for
 * `--color-success` keeps that token on the 4px BAR only: its 4.10:1 against the
 * card misses the 4.5:1 text floor, so the Strong label uses `--color-sage-light`
 * (6.61:1) instead, staying inside the existing palette.
 */
const STRENGTH_LEVELS = [
  { label: "Weak", bar: "bg-[var(--color-danger)]", text: "text-[var(--color-danger)]" },
  { label: "Fair", bar: "bg-[var(--color-warning)]", text: "text-[var(--color-warning)]" },
  { label: "Good", bar: "bg-[var(--color-sage)]", text: "text-[var(--color-sage)]" },
  { label: "Strong", bar: "bg-[var(--color-success)]", text: "text-[var(--color-sage-light)]" },
];

/**
 * The password-strength meter, shared by the registration form and the reset
 * screen so the two cannot show different rules or different levels.
 *
 * It renders nothing while the field is empty, which is the single place that
 * guarantee lives: callers only decide whether the meter is relevant to them.
 */
export function PasswordStrengthMeter({ password }: { password: string }) {
  /*
   * The backend only enforces `@Size(min = 8, max = 128)` on a password, so the
   * extra criteria here guide without pretending to be requirements, and the score
   * is clamped to at least one level whenever anything has been typed: a bare grey
   * bar with no label would be ambiguous.
   */
  const strengthLevel = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= AUTH_RULES.passwordMinLength) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return Math.min(STRENGTH_LEVELS.length, Math.max(1, score));
  }, [password]);

  if (!password) return null;

  const strength = STRENGTH_LEVELS[strengthLevel - 1];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between font-ui text-xs text-[var(--color-text-secondary)]">
        <span>Password strength</span>
        {strength && (
          <span className={`text-[12px] font-medium ${strength.text}`} aria-hidden="true">
            {strength.label}
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={`h-1 rounded-[var(--radius-pill)] ${
              strength && index < strengthLevel ? strength.bar : "bg-[rgba(229,217,182,0.2)]"
            }`}
          />
        ))}
      </div>
      {/*
        12px text, so it needs the 4.5:1 pair: `--color-text-muted` (the Input's own
        hint token) only reaches 4.14:1 on this card surface, while
        `--color-text-secondary` measures 5.04:1.
      */}
      <p className="font-ui text-[12px] text-[var(--color-text-secondary)]">{PASSWORD_RULE_HINT}</p>
      {/*
        The visible label is hidden from assistive tech so the change is announced
        once, as a full sentence rather than a bare adjective.
      */}
      <p className="sr-only" role="status" aria-live="polite">
        {strength ? `Password strength: ${strength.label}` : ""}
      </p>
    </div>
  );
}
