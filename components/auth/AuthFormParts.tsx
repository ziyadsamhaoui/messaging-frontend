"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/*
 * Two pieces of markup that every authentication form needs and that must not
 * drift between them: the reserved slot for a form-level message, and the quiet
 * inline link used for secondary navigation ("Forgot password?", "Back to sign
 * in"). Both are tiny on purpose — enough to share one implementation, not enough
 * to become a layout of their own.
 */

/**
 * The reserved, single live region for a form-level message.
 *
 * Keeping the slot in the layout at all times is what stops an error from shifting
 * the primary button sideways or moving the card's top edge: the region is the
 * same height whether or not it has something to say.
 */
export function FormMessageRegion({ message }: { message: string | null }) {
  return (
    <div className="flex min-h-9 items-center" aria-live="polite">
      {message && (
        <div className="flex items-start gap-3 rounded-[var(--radius-control)] border border-[rgba(247,179,168,0.35)] bg-[var(--color-error-surface)] px-3.5 py-3 font-ui text-sm text-[var(--color-danger)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}

/**
 * A secondary link at the 13px chrome size. `--color-sage-light` measures 6.61:1
 * against the card surface, so it passes the 4.5:1 text floor while staying quiet
 * next to a label or a primary button.
 */
export const AUTH_QUIET_LINK_CLASS =
  "focus-ring rounded-[6px] font-ui text-[13px] font-medium text-[var(--color-sage-light)] " +
  "underline decoration-[rgba(194,214,160,0.45)] underline-offset-2 transition-colors " +
  "hover:text-[var(--color-parchment)] hover:decoration-[var(--color-parchment)]";

export function AuthQuietLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={className ? `${AUTH_QUIET_LINK_CLASS} ${className}` : AUTH_QUIET_LINK_CLASS}>
      {children}
    </Link>
  );
}
