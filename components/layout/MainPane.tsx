import React from "react";
import { cn } from "@/lib/utils";

export function MainPane({
  children,
  className,
  hideOnNarrow,
}: {
  children: React.ReactNode;
  className?: string;
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
