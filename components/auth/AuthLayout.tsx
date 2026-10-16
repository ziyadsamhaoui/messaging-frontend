import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { CursorGrid } from "@/components/ui/CursorGrid";
import { HEADER_WORDMARK_SIZE } from "@/components/ui/SiteHeader";
import { Wordmark } from "@/components/ui/Wordmark";

/*
 * The card surface, shared by every authentication screen (sign in, create
 * account, forgot password, reset password) so the four cannot drift apart.
 * Exported as a constant rather than wrapped in a component, matching how the
 * header sizing is shared from `SiteHeader`. Callers pass their own width.
 *
 * On phones there is no card at all: no fill, border, radius or shadow, so the
 * fields and the submit button read as sitting directly on the page and nothing
 * frames them. Only padding is kept, so the fields do not touch the screen edges.
 * From `sm` up the raised surface is restored, unchanged from before.
 */
export const AUTH_CARD_SURFACE =
  "h-fit w-full p-5 " +
  "sm:rounded-[var(--radius-surface)] sm:border sm:border-[var(--color-border)] " +
  "sm:bg-[var(--color-surface-raised)] sm:p-8 sm:shadow-[var(--shadow-card)]";

/** Desktop card width (~480px). */
export const AUTH_CARD_WIDTH = "max-w-[30rem]";

/*
 * Every authentication field, on every authentication screen.
 *
 * Labels already render in Source Sans 3 (the interface/chrome face), but the
 * fields did not: `globals.css` still carries an UNLAYERED
 * `input, textarea, button { font-family: inherit }` rule, and unlayered
 * declarations outrank every layered Tailwind utility, so the `font-ui` class
 * that Input already applies was silently losing to the inherited body serif.
 * That left labels sans and typed text/placeholders serif in the same form.
 *
 * Scoped here on purpose: moving that rule into `@layer base` would change every
 * input, textarea and <button> in the app, which is outside this task. `!` is
 * needed because no ordinary utility can outrank an unlayered declaration, and
 * 16px keeps mobile browsers from zooming on focus.
 */
export const AUTH_FIELD_CLASS = "font-ui! text-[16px]";

/**
 * The chrome shared by `/login` and `/register`: the dark-forest atmosphere, the
 * cream header, and one card slot.
 *
 * Both routes render this same shell, which is what keeps the card's top edge in
 * exactly the same place when the visitor switches modes — the card is offset a
 * fixed 10vh below the header rather than vertically centred, so a taller form
 * grows downward without moving its header or the segmented control.
 *
 * The header is the public mark at the shared size, with the single home link as a
 * quiet ghost link on the right. It mirrors `SiteHeader`'s bar — same height, same
 * edge-to-edge padding — so the logo sits at the same x as it does on the landing
 * page instead of being inset by a container the public header does not use.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-forest-deep)] text-[var(--color-parchment)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(110%_80%_at_12%_-10%,rgba(95,141,78,0.32),transparent_58%),radial-gradient(90%_80%_at_100%_115%,rgba(40,84,48,0.6),transparent_60%)]"
      />

      {/* Sits under the header and the card (both `z-10`+), over the wash. */}
      <CursorGrid />

      <header className="relative z-20 border-b border-[rgba(40,84,48,0.25)] bg-[var(--color-parchment)]">
        <div className="flex h-[68px] w-full items-center justify-between gap-4 px-4 sm:px-6">
          <Wordmark hideNameOnMobile className={HEADER_WORDMARK_SIZE} />
          {/*
            A pill rather than a bare ghost link: a bordered, softly raised control
            on the cream bar, with the arrow nudging left on hover. It reuses the
            shared secondary button so it stays consistent with the site's actions.
          */}
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

      {/*
       * Full bleed on phones: no side gutter and no card surface, so the fields and
       * the button sit straight on the background edge to edge. The gutters — and the
       * raised card — come back from `sm` up.
       */}
      <main className="relative z-10 flex flex-1 justify-center px-0 pb-16 pt-[10vh] sm:px-6">
        {children}
      </main>
    </div>
  );
}
