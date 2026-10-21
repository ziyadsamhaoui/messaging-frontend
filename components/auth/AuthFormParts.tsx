"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";


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
