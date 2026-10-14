import React from "react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { HEADER_WORDMARK_SIZE } from "@/components/ui/SiteHeader";
import { Wordmark } from "@/components/ui/Wordmark";

/**
 * The chrome shared by `/login` and `/register`: the dark-forest atmosphere, the
 * cream header, and one card slot.
 *
 * Both routes render this same shell, which is what keeps the card's top edge in
 * exactly the same place when the visitor switches modes — the card is offset a
 * fixed 10vh below the header rather than vertically centred, so a taller form
 * grows downward without moving its header or the segmented control.
 *
 * The header is the public mark at the shared size, with the only other home link
 * (the floating one that used to sit under the card is gone) as a quiet ghost link.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-forest-deep)] text-[var(--color-parchment)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(110%_80%_at_12%_-10%,rgba(95,141,78,0.32),transparent_58%),radial-gradient(90%_80%_at_100%_115%,rgba(40,84,48,0.6),transparent_60%)]"
      />

      <header className="relative z-20 border-b border-[rgba(40,84,48,0.25)] bg-[var(--color-parchment)]">
        <div className="mx-auto flex h-[68px] w-full max-w-6xl items-center justify-between gap-4 px-6">
          <Wordmark hideNameOnMobile className={HEADER_WORDMARK_SIZE} />
          <nav aria-label="Authentication">
            <Link href="/" className={buttonClasses({ variant: "ghost", tone: "light" })}>
              Back to home
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 justify-center px-4 pb-16 pt-[10vh] sm:px-6">
        {children}
      </main>
    </div>
  );
}
