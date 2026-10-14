import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Wordmark } from "@/components/ui/Wordmark";

/**
 * The public header: cream bar, mark pinned to the far left, actions to the far
 * right, both bleeding to the viewport edges rather than sitting in the hero
 * container.
 *
 * The wordmark is the shared component; only this header scales it up, so every
 * other screen keeps the default mark without that component having to change.
 */
/** Shared by every page-level header (the public site header and the auth header),
 * so the two bars cannot drift apart.
 */
export const HEADER_WORDMARK_SIZE =
  "[&_img]:h-9 [&_img]:w-9 [&_span]:text-[22px] " +
  "min-[480px]:[&_img]:h-[46px] min-[480px]:[&_img]:w-[46px] min-[480px]:[&_span]:text-[28px]";

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-[rgba(40,84,48,0.25)] bg-[var(--color-parchment)]">
      <div className="flex h-[68px] w-full items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark hideNameOnMobile className={HEADER_WORDMARK_SIZE} />
        <nav aria-label="Primary" className="flex items-center gap-2">
          <Link href="/login" className={buttonClasses({ variant: "ghost", tone: "light" })}>
            Log in
          </Link>
          <Link href="/login" className={buttonClasses({ variant: "primary", tone: "light" })}>
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}
