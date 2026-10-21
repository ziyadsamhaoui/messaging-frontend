import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface WordmarkProps {
  tone?: "onLight" | "onDark";
  href?: string;
  className?: string;
  hideNameOnMobile?: boolean;
}

export function Wordmark({
  tone = "onLight",
  href = "/",
  className,
  hideNameOnMobile = false,
}: WordmarkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "focus-ring flex items-center gap-2.5 rounded-[var(--radius-control)] ml-0 max-w-fit",
        className
      )}
    >
      <Image src="/favicon.png" width={40} height={40} alt="BadrLink" className="h-9 w-9" />
      <span
        className={cn(
          "font-display text-2xl font-semibold leading-none",
          tone === "onLight"
            ? "text-[var(--color-forest)]"
            : "text-[var(--color-parchment)]",
          hideNameOnMobile && "hidden sm:inline"
        )}
      >
        BadrLink
      </span>
    </Link>
  );
}
