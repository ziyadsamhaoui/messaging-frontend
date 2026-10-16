import React from "react";
import { cn } from "@/lib/utils";

/**
 * Zone three: the open conversation or a detail view, on the parchment surface.
 *
 * It is the document's `main` landmark and the target of the shell's skip link, so
 * there is exactly one of these per app route.
 */
export function MainPane({
  children,
  className,
  hideOnNarrow,
}: {
  children: React.ReactNode;
  className?: string;
  /** Hides the pane below md while the list is the visible pane on a small screen. */
  hideOnNarrow?: boolean;
}) {
  return (
    <main
      id="main-pane"
      tabIndex={-1}
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-1 flex-col bg-[var(--app-pane)] focus:outline-none",
        hideOnNarrow && "max-md:hidden",
        className
      )}
    >
      {children}
    </main>
  );
}
