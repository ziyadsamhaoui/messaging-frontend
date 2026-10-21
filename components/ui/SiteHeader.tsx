import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/Button";
import { Wordmark } from "@/components/ui/Wordmark";

export const HEADER_WORDMARK_SIZE =
  "[&_img]:h-9 [&_img]:w-9 [&_span]:text-[22px] " +
  "min-[480px]:[&_img]:h-[46px] min-[480px]:[&_img]:w-[46px] min-[480px]:[&_span]:text-[28px]";

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-[rgba(40,84,48,0.25)] bg-[var(--color-parchment)]">
      <div className="flex h-[68px] w-full items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark hideNameOnMobile className={cn(HEADER_WORDMARK_SIZE, "ml-0")} />
        <nav aria-label="Primary" className="flex items-center gap-2">
          <Link
            href="/login"
            className={buttonClasses({ variant: "secondary", tone: "light", className: "rounded-full" })}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className={buttonClasses({ variant: "primary", tone: "light", className: "rounded-full" })}
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}