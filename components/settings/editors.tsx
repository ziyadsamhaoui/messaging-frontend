"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  BellRing,
  Info,
  Keyboard,
  Lock,
  Palette,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { SearchInput } from "@/components/ui/SearchInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useBlockedUserIds, useUnblockUser } from "@/hooks/useBlocks";
import { useUser } from "@/hooks/useUser";
import { usePushDiagnostics, usePushStatus } from "@/hooks/usePush";
import { errorMessage } from "@/lib/errors";
import { disablePush, enablePush, pushBlockingReason, showTestNotification } from "@/lib/push";
import { formatCalendarDate } from "@/lib/time";
import { usePrefsStore } from "@/store/prefsStore";
import { MessageDensity, TextSize, TimeFormat } from "@/lib/prefs";
import { SavedNote, SettingsCard, SettingsEditorShell, SettingsRow } from "./parts";
import { version } from "@/package.json";

function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 1600);
    return () => clearTimeout(timer);
  }, [saved]);
  return { saved, flash: () => setSaved(true) };
}

export function AccountEditor({ onBack }: { onBack: () => void }) {
  const auth = useAuth();
  const memberSince = formatCalendarDate(auth.user?.createdAt ?? null);

  return (
    <SettingsEditorShell
      icon={<ShieldCheck size={26} strokeWidth={1.75} />}
      title="Account and security"
      description="What this account is, and how it is protected."
      onBack={onBack}
    >
      <SettingsCard title="Account">
        <SettingsRow
          icon={<Lock size={18} strokeWidth={1.75} />}
          title="Email"
          description="Your email is held by the sign-in service and is not exposed to the app."
          control={
            <span className="font-ui text-[13px] text-[var(--app-pane-text-soft)]">
              Not shown here
            </span>
          }
        />
        <SettingsRow
          title="Username"
          description={auth.user?.username ? `@${auth.user.username}` : "Loading…"}
          control={
            <Link
              href="/app/settings/profile"
              className="focus-ring-light inline-flex min-h-9 items-center font-ui text-[13px] font-medium text-[var(--app-pane-text)] underline max-md:min-h-11"
            >
              Edit in Profile
            </Link>
          }
        />
        {memberSince && (
          <SettingsRow title="Member since" description={memberSince} />
        )}
      </SettingsCard>

      <SettingsCard title="Password">
        <SettingsRow
          title="Password"
          description="Your password can't be changed here. Use “Forgot password” on the sign-in screen to reset it by email."
        />
      </SettingsCard>
    </SettingsEditorShell>
  );
}

export function AppearanceEditor({ onBack }: { onBack: () => void }) {
  const prefs = usePrefsStore();
  const { saved, flash } = useSavedFlash();

  const change = <K extends keyof ReturnType<typeof usePrefsStore.getState>>(
    key: K,
    value: ReturnType<typeof usePrefsStore.getState>[K]
  ) => {
    prefs.set(key as never, value as never);
    flash();
  };

  return (
    <SettingsEditorShell
      icon={<Palette size={26} strokeWidth={1.75} />}
      title="Appearance and chat behavior"
      description="Saved on this device. These choices are not stored on your account, so another browser keeps its own."
      onBack={onBack}
      badge={
        <span className="mt-1 flex items-center gap-2">
          <span className="rounded-full bg-[rgba(40,84,48,0.1)] px-3 py-1 font-ui text-[12px] font-medium text-[var(--app-pane-text-soft)]">
            Saved on this device
          </span>
          <SavedNote visible={saved} label="Saved" />
        </span>
      }
    >
      <AppearancePreview />

      <SettingsCard>
        <SettingsRow
          title="Text size"
          description="Scales the whole interface on this device."
          control={
            <SegmentedControl
              idBase="text-size"
              label="Text size"
              value={prefs.textSize}
              options={[
                { value: "small", label: "Small" },
                { value: "default", label: "Default" },
                { value: "large", label: "Large" },
              ]}
              onChange={(value) => change("textSize", value as TextSize)}
            />
          }
        />
        <SettingsRow
          title="Message density"
          description="Changes bubble padding and the gaps between messages."
          control={
            <SegmentedControl
              idBase="density"
              label="Message density"
              value={prefs.density}
              options={[
                { value: "comfortable", label: "Comfortable" },
                { value: "compact", label: "Compact" },
              ]}
              onChange={(value) => change("density", value as MessageDensity)}
            />
          }
        />
        <SettingsRow
          title="Time format"
          description="Used by every clock in the app: chat list, bubbles and notifications."
          control={
            <SegmentedControl
              idBase="time-format"
              label="Time format"
              value={prefs.timeFormat}
              options={[
                { value: "12h", label: "12-hour" },
                { value: "24h", label: "24-hour" },
              ]}
              onChange={(value) => change("timeFormat", value as TimeFormat)}
            />
          }
        />
        <SettingsRow
          title="Enter key"
          description="Send the message, or insert a newline (Ctrl or Cmd plus Enter always sends)."
          control={
            <SegmentedControl
              idBase="enter-key"
              label="Enter key behavior"
              value={prefs.enterBehavior}
              options={[
                { value: "send", label: "Send" },
                { value: "newline", label: "Newline" },
              ]}
              onChange={(value) => change("enterBehavior", value as "send" | "newline")}
            />
          }
        />
        <SettingsRow
          title="Sidebar"
          description="Whether the desktop sidebar starts collapsed on the next load."
          control={
            <Switch
              label="Start collapsed on desktop"
              checked={prefs.sidebarStartCollapsed}
              onChange={(checked) => change("sidebarStartCollapsed", checked)}
            />
          }
        />
        <SettingsRow
          title="Reduce motion"
          description="Overrides the operating system's animation preference for this app."
          control={
            <SegmentedControl
              idBase="motion"
              label="Reduce motion"
              value={prefs.motion}
              options={[
                { value: "system", label: "System" },
                { value: "always", label: "Always" },
                { value: "never", label: "Never" },
              ]}
              onChange={(value) => change("motion", value as "system" | "always" | "never")}
            />
          }
        />
      </SettingsCard>
    </SettingsEditorShell>
  );
}

function AppearancePreview() {
  const prefs = usePrefsStore();
  const clock = prefs.timeFormat === "12h" ? "1:29 PM" : "13:29";

  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="font-ui text-[13px] font-semibold text-[var(--app-pane-text-soft)]">Preview</h3>
      <div
        data-preview
        className="flex flex-col gap-2 rounded-[18px] border border-[var(--app-pane-divider)] bg-[var(--app-pane-raised)] p-4"
      >
        <div className="flex justify-start">
          <p className="w-fit max-w-[70%] rounded-[var(--app-bubble-radius)] border border-[var(--app-bubble-in-border)] bg-[var(--app-bubble-in)] px-[var(--app-bubble-px)] py-[var(--app-bubble-py)] font-ui text-[15px] leading-5 text-[var(--app-bubble-in-text)]">
            <span className="float-right ml-3 mt-[3px] text-[11px] leading-none text-[var(--app-pane-text-soft)]">
              {clock}
            </span>
            Preview of a received message
          </p>
        </div>
        <div className="flex justify-end">
          <p className="w-fit max-w-[70%] rounded-[var(--app-bubble-radius)] bg-[var(--app-bubble-out)] px-[var(--app-bubble-px)] py-[var(--app-bubble-py)] font-ui text-[15px] leading-5 text-[var(--app-bubble-out-text)]">
            <span className="float-right ml-3 mt-[3px] text-[11px] leading-none text-[rgba(229,217,182,0.7)]">
              {clock}
            </span>
            Preview of a sent message
          </p>
        </div>
        <div className="flex justify-end">
          <span className="flex h-[22px] items-center gap-1 rounded-full border border-[var(--app-pane-control-border)] bg-[var(--app-pane-raised)] px-1.5 font-ui text-[12px] text-[var(--app-pane-text)]">
            <span aria-hidden="true">👍</span>2
          </span>
        </div>
      </div>
    </section>
  );
}

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: "Ctrl / ⌘ + B", action: "Collapse or expand the sidebar" },
  { keys: "Ctrl / ⌘ + K", action: "Focus the search field of the current list" },
  { keys: "Alt + 1 … 4", action: "Switch between Chats, Connections, Invites and Notifications" },
  { keys: "Enter", action: "Send the message (or insert a newline, per Appearance settings)" },
  { keys: "Shift + Enter", action: "Insert a newline in the composer" },
  { keys: "Escape", action: "Close a menu, popover or dialog; clear a search field" },
  { keys: "Arrow keys", action: "Move through menu items" },
  { keys: "Home / End", action: "Jump to the first or last item of a menu" },
];

export function ShortcutsEditor({ onBack }: { onBack: () => void }) {
  return (
    <SettingsEditorShell
      icon={<Keyboard size={26} strokeWidth={1.75} />}
      title="Keyboard shortcuts"
      description="Every shortcut below is implemented in this app."
      onBack={onBack}
    >
      <SettingsCard>
        {SHORTCUTS.map((shortcut) => (
          <SettingsRow
            key={shortcut.keys}
            title={shortcut.action}
            control={
              <kbd className="rounded-lg border border-[var(--app-pane-control-border)] px-2 py-1 font-mono text-[12px] text-[var(--app-pane-text)]">
                {shortcut.keys}
              </kbd>
            }
          />
        ))}
      </SettingsCard>
    </SettingsEditorShell>
  );
}

export function AboutEditor({ onBack }: { onBack: () => void }) {
  return (
    <SettingsEditorShell
      icon={<Info size={26} strokeWidth={1.75} />}
      title="About BadrLink"
      description="Real-time messaging, rooted in calm."
      onBack={onBack}
    >
      <SettingsCard>
        <SettingsRow title="Version" description={version} />
        <SettingsRow
          title="Environment"
          description={process.env.NODE_ENV === "production" ? "Production" : "Development"}
        />
        <SettingsRow
          title="Interface font"
          description="Source Sans 3, used everywhere except the BadrLink wordmark."
        />
      </SettingsCard>
    </SettingsEditorShell>
  );
}

export function PushEditor({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const status = usePushStatus(4000);
  const diagnostics = usePushDiagnostics(true);
  const [busy, setBusy] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const blocking = pushBlockingReason();

  const copy =
    blocking && status.state === "unsupported"
      ? { title: "Not supported", body: blocking }
      : status.state === "blocked"
        ? {
            title: "Blocked in the browser",
            body: "Notifications are denied for this site. Open the browser's site settings for this address, allow notifications, then reload.",
          }
        : status.state === "enabled"
          ? {
              title: "Enabled on this device",
              body: "This browser is subscribed. Notifications arrive while the app is closed, as long as the server can send them.",
            }
          : {
              title: "Not enabled",
              body: "Turn push on for this browser to be notified when the app is not in front of you.",
            };

  async function toggle() {
    setBusy(true);
    try {
      const result = status.state === "enabled" ? await disablePush() : await enablePush();
      if (result.ok) {
        toast.push(status.state === "enabled" ? "Push disabled on this device." : "Push enabled on this device.", "success");
      } else {
        toast.push(result.reason, "error");
      }
      await status.refresh();
      await diagnostics.run();
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const result = await showTestNotification();
      if (!result.ok) toast.push(result.reason, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsEditorShell
      icon={<BellRing size={26} strokeWidth={1.75} />}
      title="Push on this device"
      description="Notifications that reach this browser even when BadrLink is closed."
      onBack={onBack}
    >
      <SettingsCard title="Status">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${
                status.state === "enabled"
                  ? "bg-[var(--color-sage)]"
                  : status.state === "blocked"
                    ? "bg-[var(--color-warning)]"
                    : "bg-[var(--app-pane-control-border)]"
              }`}
            />
            <p className="font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
              {status.ready ? copy.title : "Checking…"}
            </p>
          </div>
          <p className="font-ui text-[13px] leading-relaxed text-[var(--app-pane-text-soft)]">
            {copy.body}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {status.state !== "blocked" && status.state !== "unsupported" && (
              <button
                type="button"
                onClick={() => void toggle()}
                disabled={busy}
                className={buttonClasses({
                  variant: status.state === "enabled" ? "secondary" : "primary",
                  size: "md",
                  tone: "pane",
                })}
              >
                {status.state === "enabled" ? "Disable on this device" : "Enable on this device"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void test()}
              disabled={busy || status.permission !== "granted"}
              className={buttonClasses({ variant: "secondary", size: "md", tone: "pane" })}
            >
              <Send size={16} strokeWidth={1.75} aria-hidden="true" />
              Send test notification
            </button>
          </div>
          <p className="font-ui text-[12px] text-[var(--app-pane-text-soft)]">
            The test appears through this browser&apos;s service worker. If it shows up, permission,
            the worker and the display path all work on this device.
          </p>
        </div>
      </SettingsCard>

      <SettingsCard title="Diagnostics">
        <button
          type="button"
          onClick={() => setShowDiagnostics((value) => !value)}
          aria-expanded={showDiagnostics}
          className="focus-ring-light flex min-h-[56px] w-full items-center gap-3 px-4 text-left"
        >
          <RefreshCw size={18} strokeWidth={1.75} aria-hidden="true" />
          <span className="min-w-0 flex-1 font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
            {showDiagnostics ? "Hide live checks" : "Show live checks"}
          </span>
        </button>
        {showDiagnostics && (
          <ul className="flex flex-col px-4 pb-3">
            {(diagnostics.checks ?? []).map((check) => (
              <li key={check.label} className="flex items-start gap-2 py-1.5">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    check.ok ? "bg-[var(--color-sage)]" : "bg-[var(--color-warning)]"
                  }`}
                />
                <span className="min-w-0">
                  <span className="block font-ui text-[13px] font-medium text-[var(--app-pane-text)]">
                    {check.label}: {check.ok ? "ok" : "needs attention"}
                  </span>
                  <span className="block font-ui text-[12px] text-[var(--app-pane-text-soft)]">
                    {check.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </SettingsEditorShell>
  );
}

export function BlockedUsersEditor({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const currentUserId = useAuth().session?.userId ?? null;
  const blockedQuery = useBlockedUserIds(currentUserId);
  const unblock = useUnblockUser(currentUserId);
  const ids = blockedQuery.data ?? [];
  const [query, setQuery] = useState("");

  const visible = query.trim()
    ? ids.filter((id) => id.toLowerCase().includes(query.trim().toLowerCase()))
    : ids;

  return (
    <SettingsEditorShell
      icon={<Ban size={26} strokeWidth={1.75} />}
      title="Blocked users"
      description="People who cannot message you. You can unblock anyone from here."
      onBack={onBack}
    >
      {blockedQuery.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : blockedQuery.isError ? (
        <ErrorBlock
          tone="pane"
          title="Couldn't load blocked users"
          reason="The blocklist did not come back from the server."
          onRetry={() => void blockedQuery.refetch()}
        />
      ) : ids.length === 0 ? (
        <EmptyState
          tone="pane"
          icon={<Ban size={22} strokeWidth={1.75} />}
          title="You haven't blocked anyone"
          description="People you block cannot message you and are listed here."
        />
      ) : (
        <>
          {ids.length > 8 && (
            <SearchInput
              tone="light"
              value={query}
              onValueChange={setQuery}
              placeholder="Search blocked users"
              aria-label="Search blocked users"
            />
          )}
          <SettingsCard>
            {visible.map((userId) => (
              <BlockedRow
                key={userId}
                userId={userId}
                pending={unblock.isPending && unblock.variables === userId}
                onUnblock={async () => {
                  try {
                    await unblock.mutateAsync(userId);
                    toast.push("User unblocked.", "success");
                  } catch (error) {
                    toast.push(errorMessage(error), "error");
                  }
                }}
              />
            ))}
          </SettingsCard>
        </>
      )}
    </SettingsEditorShell>
  );
}

function BlockedRow({
  userId,
  pending,
  onUnblock,
}: {
  userId: string;
  pending: boolean;
  onUnblock: () => Promise<void>;
}) {
  const userQuery = useUser(userId);
  const username = userQuery.data?.username ?? userId.slice(0, 8);

  return (
    <SettingsRow
      title={username}
      description={`@${username} · cannot message you`}
      control={
        <span className="flex items-center gap-3">
          <Avatar
            name={username}
            seed={userId}
            src={userQuery.data?.profilePictureUrl}
            size={28}
            presenceRing="var(--app-pane-raised)"
          />
          <button
            type="button"
            onClick={() => void onUnblock()}
            disabled={pending}
            className={buttonClasses({ variant: "secondary", size: "sm", tone: "pane" })}
          >
            {pending ? "Unblocking…" : "Unblock"}
          </button>
        </span>
      }
    />
  );
}

export function useBackToSettings() {
  const router = useRouter();
  return () => router.push("/app/settings");
}
