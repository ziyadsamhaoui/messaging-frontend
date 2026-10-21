import React from "react";
import { cn } from "@/lib/utils";
import { PanelResizeHandle } from "./PanelResizeHandle";

export const SECTION_PANEL_HEADING_ID = "section-panel-heading";

interface SectionPanelProps {
  title: string;
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hideOnNarrow?: boolean;
}

export function SectionPanel({
  title,
  actions,
  toolbar,
  children,
  className,
  hideOnNarrow,
}: SectionPanelProps) {
  return (
    <aside
      role="complementary"
      aria-label={title}
      className={cn(
        "app-panel relative flex h-full min-h-0 shrink-0 flex-col border-r border-[var(--app-panel-divider)] bg-[var(--app-panel)]",
        hideOnNarrow && "max-md:hidden",
        className
      )}
    >
      <div className="flex h-[72px] shrink-0 items-center justify-between gap-2 px-4">
        <h1
          id={SECTION_PANEL_HEADING_ID}
          tabIndex={-1}
          className="font-ui text-[20px] font-semibold text-[var(--app-panel-text)] focus:outline-none"
        >
          {title}
        </h1>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      {toolbar && <div className="shrink-0 px-3 pb-2">{toolbar}</div>}
      <div className="app-scroll-dark min-h-0 flex-1 overflow-y-auto pb-3">{children}</div>
      <PanelResizeHandle />
    </aside>
  );
}
