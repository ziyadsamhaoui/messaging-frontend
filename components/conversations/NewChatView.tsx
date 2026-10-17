"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";
import {
  SegmentedControl,
  segmentedPanelId,
  segmentedTabId,
} from "@/components/ui/SegmentedControl";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { UserSearchCombobox } from "@/components/ui/UserSearchCombobox";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { buttonClasses } from "@/components/ui/Button";
import { CreateRoomRequest, PublicUserDto, RoomType } from "@/lib/types";
import { errorMessage } from "@/lib/errors";

type Step = "people" | "group";

const TYPE_ID = "new-chat-type";

/**
 * Starting a conversation inside the section panel, not in a dialog.
 *
 * A dialog would cover the very list the new room is about to join, and it would
 * leave the destination's URL pointing at nothing. The panel view keeps the shell,
 * the back button and the rail in place.
 *
 * Direct is one step: pick the person, start. A group is two steps on purpose —
 * choose the people, then name the room and review who is in it — because a group
 * has two different kinds of decision and mixing them on one screen is what makes
 * a form feel like a form.
 */
export function NewChatView({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (body: CreateRoomRequest) => Promise<void>;
}) {
  const [type, setType] = useState<RoomType>("DIRECT");
  const [step, setStep] = useState<Step>("people");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<PublicUserDto[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = selected.length > 0;

  const selectedIds = useMemo(() => new Set(selected.map((user) => user.id)), [selected]);

  function toggleUser(user: PublicUserDto) {
    setError(null);
    setSelected((prev) => {
      const exists = prev.some((item) => item.id === user.id);
      if (exists) return prev.filter((item) => item.id !== user.id);
      if (type === "DIRECT") return [user];
      return [...prev, user];
    });
  }

  function changeType(next: RoomType) {
    setType(next);
    setStep("people");
    setError(null);
    // A group can hold many people; a direct room is exactly two. Carrying a
    // multi-person selection into Direct would silently drop everyone but one.
    setSelected((prev) => (next === "DIRECT" ? prev.slice(0, 1) : prev));
  }

  async function create() {
    if (!canContinue) {
      setError(type === "DIRECT" ? "Select a person to message." : "Select at least one person.");
      return;
    }
    if (type === "GROUP" && !name.trim()) {
      setError("A group room needs a name.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const body: CreateRoomRequest = {
        type,
        participantIds: selected.map((user) => user.id),
      };
      if (type === "GROUP") body.name = name.trim();
      await onCreate(body);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <SectionPanel
      title={step === "group" ? "Name the group" : "New chat"}
      actions={
        <IconButton
          surface="panel"
          label={step === "group" ? "Back to people" : "Cancel new chat"}
          tooltip={step === "group" ? "Back" : null}
          onClick={() => {
            if (step === "group") {
              setStep("people");
              return;
            }
            onCancel();
          }}
        >
          <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>
      }
      toolbar={
        step === "people" ? (
          <SegmentedControl
            idBase={TYPE_ID}
            label="Conversation type"
            options={[
              { value: "DIRECT" as const, label: "Direct" },
              { value: "GROUP" as const, label: "Group" },
            ]}
            value={type}
            onChange={changeType}
          />
        ) : undefined
      }
    >
      <div
        // The tab semantics only exist while the type control is on screen; the
        // group step is a view of its own, not a tab panel.
        {...(step === "people"
          ? {
              role: "tabpanel" as const,
              id: segmentedPanelId(TYPE_ID),
              "aria-labelledby": segmentedTabId(TYPE_ID, type),
              tabIndex: -1,
            }
          : {})}
        className="focus-ring rounded-xl"
      >
        {step === "people" ? (
          <div className="flex flex-col gap-4 px-3">
            <p className="font-ui text-[13px] leading-relaxed text-[var(--app-panel-text-soft)]">
              {type === "DIRECT"
                ? "Find the person you want to talk to. A direct chat opens as soon as you start it."
                : "Choose everyone who should be in the group. You can name it on the next step."}
            </p>

            <UserSearchCombobox
              variant="search"
              label="Search people"
              value={query}
              onValueChange={setQuery}
              onSelect={toggleUser}
              placeholder="Type at least 2 characters"
              inputClassName="bg-[var(--app-panel-field)]"
              closeOnSelect={false}
              renderOption={(user) => (
                <>
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <Avatar
                      name={user.username}
                      seed={user.id}
                      src={user.profilePictureUrl}
                      size={28}
                    />
                    <span className="truncate font-ui text-sm text-[var(--app-panel-text)]">
                      @{user.username}
                    </span>
                  </span>
                  {selectedIds.has(user.id) && (
                    <span className="flex shrink-0 items-center gap-1 font-ui text-xs font-semibold text-[var(--color-sage)]">
                      <Check size={14} strokeWidth={2} aria-hidden="true" />
                      Selected
                    </span>
                  )}
                </>
              )}
            />

            {selected.length === 0 ? (
              <p className="font-ui text-[13px] text-[var(--app-panel-text-soft)]">
                No one selected yet.
              </p>
            ) : (
              <ul aria-label="Selected people" className="flex flex-col gap-1">
                {selected.map((user) => (
                  <li
                    key={user.id}
                    className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--app-panel-divider)] px-2 py-1.5"
                  >
                    <Avatar
                      name={user.username}
                      seed={user.id}
                      src={user.profilePictureUrl}
                      size={40}
                    />
                    <span className="min-w-0 flex-1 truncate font-ui text-sm text-[var(--app-panel-text)]">
                      @{user.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleUser(user)}
                      aria-label={`Remove @${user.username}`}
                      className="focus-ring flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--app-panel-text-soft)] hover:bg-[var(--app-panel-hover)] hover:text-[var(--app-panel-text)]"
                    >
                      <X size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && (
              <p role="alert" className="font-ui text-[13px] font-medium text-[var(--app-danger-on-dark)]">
                {error}
              </p>
            )}

            <div className="flex items-center gap-2 pb-2">
              {type === "GROUP" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!canContinue) {
                      setError("Select at least one person.");
                      return;
                    }
                    setError(null);
                    setStep("group");
                  }}
                  className={buttonClasses({ variant: "primary", size: "md", tone: "panel" })}
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void create()}
                  disabled={!canContinue || creating}
                  className={buttonClasses({ variant: "primary", size: "md", tone: "panel" })}
                >
                  {creating ? "Starting…" : "Start chat"}
                </button>
              )}
              <button
                type="button"
                onClick={onCancel}
                className={buttonClasses({ variant: "ghost", size: "md", tone: "panel" })}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-3">
            <Input
              label="Group name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              placeholder="Tea Circle"
              hint="This is what everyone in the group will see."
              className="bg-[var(--app-panel-field)]"
              autoFocus
            />

            <section className="flex flex-col gap-1">
              <h3 className="font-ui text-[13px] font-semibold text-[var(--app-panel-text-soft)]">
                Members ({selected.length + 1})
              </h3>
              <ul className="flex flex-col gap-1">
                <li className="flex items-center gap-2 px-1 py-1">
                  <Avatar name="You" seed="you" size={28} />
                  <span className="font-ui text-sm text-[var(--app-panel-text)]">
                    You · owner
                  </span>
                </li>
                {selected.map((user) => (
                  <li key={user.id} className="flex items-center gap-2 px-1 py-1">
                    <Avatar
                      name={user.username}
                      seed={user.id}
                      src={user.profilePictureUrl}
                      size={28}
                    />
                    <span className="min-w-0 flex-1 truncate font-ui text-sm text-[var(--app-panel-text)]">
                      @{user.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleUser(user)}
                      aria-label={`Remove @${user.username}`}
                      className="focus-ring flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--app-panel-text-soft)] hover:bg-[var(--app-panel-hover)] hover:text-[var(--app-panel-text)]"
                    >
                      <X size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {error && (
              <p role="alert" className="font-ui text-[13px] font-medium text-[var(--app-danger-on-dark)]">
                {error}
              </p>
            )}

            <div className="flex items-center gap-2 pb-2">
              <button
                type="button"
                onClick={() => void create()}
                disabled={creating || !name.trim() || selected.length === 0}
                className={buttonClasses({ variant: "primary", size: "md", tone: "panel" })}
              >
                {creating ? "Creating…" : "Create group"}
              </button>
              <button
                type="button"
                onClick={() => setStep("people")}
                className={buttonClasses({ variant: "ghost", size: "md", tone: "panel" })}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </SectionPanel>
  );
}
