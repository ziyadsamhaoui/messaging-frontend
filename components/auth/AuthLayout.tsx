import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { CursorGrid } from "@/components/ui/CursorGrid";
import { HEADER_WORDMARK_SIZE } from "@/components/ui/SiteHeader";
import { Wordmark } from "@/components/ui/Wordmark";

export const AUTH_CARD_SURFACE =
  "h-fit w-full px-8 py-5 " +
  "sm:rounded-[var(--radius-surface)] sm:border sm:border-[var(--color-border)] " +
  "sm:bg-[var(--color-surface-raised)] sm:p-8 sm:shadow-[var(--shadow-card)]";

export const AUTH_CARD_WIDTH = "max-w-[30rem]";

export const AUTH_FIELD_CLASS = "font-ui! text-[16px]";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-forest-deep)] text-[var(--color-parchment)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,transparent_55%,rgba(0,0,0,0.28))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.07] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          backgroundSize: "180px 180px",
        }}
      />

      <CursorGrid />

      <header className="relative z-20 border-b border-[rgba(40,84,48,0.25)] bg-[var(--color-parchment)]">
        <div className="flex h-[68px] w-full items-center justify-between gap-4 px-4 sm:px-6">
          <Wordmark hideNameOnMobile className={HEADER_WORDMARK_SIZE} />
          <nav aria-label="Authentication">
            <Link
              href="/"
              className={buttonClasses({
                variant: "secondary",
                tone: "light",
                size: "sm",
                className: "group gap-1.5 rounded-full pl-2.5 pr-3.5",
              })}
            >
              <ArrowLeft
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
              Back to home
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 justify-center px-0 pb-16 pt-[10vh] sm:px-6">
        {children}
      </main>
    </div>
  );
}
