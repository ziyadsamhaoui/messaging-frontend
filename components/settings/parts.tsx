"use client";

import React from "react";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";
import { buttonClasses } from "@/components/ui/Button";


export function EditorHero({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <header className="flex items-center gap-4">
      <span
        aria-hidden="true"
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[rgba(40,84,48,0.1)] text-[var(--app-pane-text-soft)]"
      >
        {icon}
      </span>
      <span className="min-w-0">
        <h2 className="font-ui text-[22px] font-semibold text-[var(--app-pane-text)]">{title}</h2>
        <p className="font-ui text-[13px] text-[var(--app-pane-text-soft)]">{description}</p>
      </span>
    </header>
  );
}

export function SettingsEditorShell({
  icon,
  title,
  description,
  children,
  onBack,
  backLabel = "Back to settings",
  badge,
  wide = false,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  badge?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="app-scroll-light min-h-0 flex-1 overflow-y-auto">
      <div
        className={cn(
          "flex w-full flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6",
          wide ? "max-w-[1100px]" : "max-w-[700px]"
        )}
      >
        <div className="flex items-center gap-2">
          {onBack && (
            <IconButton
              surface="pane"
              size="sm"
              label={backLabel}
              tooltip={null}
              onClick={onBack}
              className="-ml-1 md:hidden"
            >
              <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>
          )}
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[rgba(40,84,48,0.1)] text-[var(--app-pane-text-soft)] sm:h-16 sm:w-16"
          >
            {icon}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="font-ui text-[22px] font-semibold text-[var(--app-pane-text)]">{title}</h2>
          {description && (
            <p className="font-ui text-[13px] leading-relaxed text-[var(--app-pane-text-soft)]">
              {description}
            </p>
          )}
          {badge}
        </div>
        {children}
      </div>
    </div>
  );
}

export function SettingsSaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  saveLabel = "Save changes",
  discardLabel = "Discard",
}: {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saveLabel?: string;
  discardLabel?: string;
}) {
  if (!dirty) return null;
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="sticky bottom-0 z-10 -mx-4 mt-1 flex items-center gap-2 border-t border-[var(--app-pane-divider)] bg-[var(--app-pane)] px-4 py-3 sm:-mx-6 sm:px-6"
    >
      <p className="min-w-0 flex-1 font-ui text-[13px] text-[var(--app-pane-text-soft)]">
        You have unsaved changes
      </p>
      <button
        type="button"
        onClick={onDiscard}
        disabled={saving}
        className={buttonClasses({ variant: "secondary", size: "md", tone: "pane" })}
      >
        {discardLabel}
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className={buttonClasses({ variant: "primary", size: "md", tone: "pane" })}
      >
        {saving ? "Saving…" : saveLabel}
      </button>
    </div>
  );
}

export function SavedNote({ visible, label = "Saved on this device" }: { visible: boolean; label?: string }) {
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-1 font-ui text-[12px] text-[var(--app-pane-text-soft)] transition-opacity duration-150 motion-reduce:transition-none",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <Check size={14} strokeWidth={2} aria-hidden="true" />
      {label}
    </p>
  );
}

export function SettingsCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-1.5", className)}>
      {title && (
        <h3 className="font-ui text-[13px] font-semibold text-[var(--app-pane-text-soft)]">
          {title}
        </h3>
      )}
      <div className="divide-y divide-[var(--app-pane-divider)] overflow-hidden rounded-[18px] border border-[var(--app-pane-divider)] bg-[var(--app-pane-raised)]">
        {children}
      </div>
    </section>
  );
}

export function SettingsRow({
  icon,
  title,
  description,
  control,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  control?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-[60px] items-center gap-3 px-4 py-2.5", className)}>
      {icon && (
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(40,84,48,0.1)] text-[var(--app-pane-text-soft)]"
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
          {title}
        </span>
        {description && (
          <span className="block font-ui text-[13px] text-[var(--app-pane-text-soft)]">
            {description}
          </span>
        )}
      </span>
      {control && <span className="shrink-0">{control}</span>}
    </div>
  );
}

export function SettingsIndexRow({
  href,
  icon,
  title,
  subtitle,
  selected,
  danger,
  onClick,
  action,
}: {
  href?: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  selected?: boolean;
  danger?: boolean;
  onClick?: () => void;
  action?: React.ReactNode;
}) {
  const className = cn(
    "focus-ring group flex w-full items-center gap-3 rounded-[var(--radius-control)] px-2.5 py-2 text-left transition-colors duration-150 motion-reduce:transition-none",
    selected
      ? "bg-[var(--app-panel-active)]"
      : "hover:bg-[var(--app-panel-hover)]"
  );

  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]",
          danger
            ? "bg-[rgba(192,57,43,0.22)] text-[var(--app-danger-on-dark)]"
            : "bg-[rgba(164,190,123,0.16)] text-[var(--app-panel-text-soft)]"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "flex items-center gap-1.5",
            danger ? "text-[var(--app-danger-on-dark)]" : "text-[var(--app-panel-text)]"
          )}
        >
          <span className="truncate font-ui text-[15px] font-medium">{title}</span>
          {action}
        </span>
        {subtitle && (
          <span className="block truncate font-ui text-[13px] text-[var(--app-panel-text-soft)]">
            {subtitle}
          </span>
        )}
      </span>
      <ChevronRight
        size={18}
        strokeWidth={1.75}
        aria-hidden="true"
        className="shrink-0 text-[var(--app-panel-text-soft)]"
      />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-current={selected ? "page" : undefined}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-current={selected ? "page" : undefined}
    >
      {body}
    </button>
  );
}
