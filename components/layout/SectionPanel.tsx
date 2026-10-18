import React from "react";
import { cn } from "@/lib/utils";
import { PanelResizeHandle } from "./PanelResizeHandle";

/** Id the shell focuses after a destination change. */
export const SECTION_PANEL_HEADING_ID = "section-panel-heading";

interface SectionPanelProps {
  /** Panel title in the interface sans at 20 px semibold, e.g. "Chats". */
  title: string;
  /** Icon buttons on the right of the header. */
  actions?: React.ReactNode;
  /** The search or filter row under the header. */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Hides the whole panel below md, for the single-pane mobile layout. */
  hideOnNarrow?: boolean;
}

/**
 * Zone two: the list for the active destination.
 *
 * Every destination shares this shape — a serif title on the left, icon actions on
 * the right, then a search row, then the list — so the four panels cannot drift
 * apart. The heading is focusable because the shell moves focus to it when the
 * destination changes, which is how a keyboard user learns that the panel content
 * was replaced.
 */
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
      /*
       * Stated, not implied: an `aside` inside `main` is not exposed as a landmark by
       * browsers, so the destination panel needs the role written out to appear in a
       * screen reader's landmark list.
       */
      role="complementary"
      aria-label={title}
      className={cn(
        // The width comes from `--app-panel-width` (see `.app-panel` in globals.css),
        // which the resize handle drives and the media query clamps below 1024 px.
        "app-panel relative flex h-full min-h-0 shrink-0 flex-col border-r border-[var(--app-panel-divider)] bg-[var(--app-panel)]",
        hideOnNarrow && "max-md:hidden",
        className
      )}
    >
      <div className="flex h-[72px] shrink-0 items-center justify-between gap-2 px-4">
        {/*
          The destination's heading, so each route has exactly one `h1` and everything
          inside the pane below it is subordinate. It is also the element the shell
          focuses after a destination change, so the tag and the id travel together.
        */}
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
