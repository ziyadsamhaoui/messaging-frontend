"use client";

import React from "react";
import { FileText, ImagePlay, Music } from "lucide-react";
import { Popover } from "@/components/ui/Popover";

interface AttachmentMenuProps {
  open: boolean;
  onClose: () => void;
  anchor: HTMLButtonElement | null;
  onPick: (accept: string) => void;
}

const GROUPS = [
  {
    label: "Photos and videos",
    accept: "image/*,video/*",
    icon: ImagePlay,
  },
  {
    label: "Documents and files",
    accept:
      ".pdf,.txt,.csv,.docx,.xlsx,.pptx,.zip,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip",
    icon: FileText,
  },
  {
    label: "Audio files",
    accept: "audio/*",
    icon: Music,
  },
];

export function AttachmentMenu({ open, onClose, anchor, onPick }: AttachmentMenuProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).filter((item) => item.offsetParent !== null);
    if (items.length === 0) return;
    event.preventDefault();
    const active = document.activeElement as HTMLElement | null;
    const index = items.indexOf(active as HTMLElement);
    const next =
      event.key === "ArrowDown"
        ? items[index < 0 ? 0 : (index + 1) % items.length]
        : items[index <= 0 ? items.length - 1 : index - 1];
    next.focus();
  }

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchor={anchor}
      label="Add an attachment"
      role="menu"
      align="start"
      side="top"
      className="w-[280px] p-1 shadow-none"
    >
      <div role="none" onKeyDown={handleKeyDown}>
        {GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <button
              key={group.label}
              type="button"
              role="menuitem"
              onClick={() => onPick(group.accept)}
              className="focus-ring-light flex w-full items-center gap-3 rounded-[var(--radius-control)] px-2.5 py-2 text-left hover:bg-[var(--app-pane-hover)]"
            >
              <span className="text-[var(--app-pane-text-soft)]">
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="block min-w-0 font-ui text-[14px] font-medium text-[var(--app-pane-text)]">
                {group.label}
              </span>
            </button>
          );
        })}
      </div>
    </Popover>
  );
}
