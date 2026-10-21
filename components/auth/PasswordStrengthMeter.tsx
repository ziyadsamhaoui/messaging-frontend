"use client";

import React, { useMemo } from "react";
import { AUTH_RULES, PASSWORD_RULE_HINT } from "@/lib/authValidation";

const STRENGTH_LEVELS = [
  { label: "Weak", bar: "bg-[var(--color-danger)]", text: "text-[var(--color-danger)]" },
  { label: "Fair", bar: "bg-[var(--color-warning)]", text: "text-[var(--color-warning)]" },
  { label: "Good", bar: "bg-[var(--color-sage)]", text: "text-[var(--color-sage)]" },
  { label: "Strong", bar: "bg-[var(--color-success)]", text: "text-[var(--color-sage-light)]" },
];

export function PasswordStrengthMeter({ password }: { password: string }) {
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
      <p className="font-ui text-[12px] text-[var(--color-text-secondary)]">{PASSWORD_RULE_HINT}</p>
      <p className="sr-only" role="status" aria-live="polite">
        {strength ? `Password strength: ${strength.label}` : ""}
      </p>
    </div>
  );
}
