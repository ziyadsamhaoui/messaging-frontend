"use client";

import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { CreateRoomRequest, PublicUserDto, RoomType } from "../../lib/types";
import { useUserSearch } from "../../hooks/useUserSearch";
import { errorMessage } from "../../lib/errors";

interface NewConversationModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (body: CreateRoomRequest) => Promise<void>;
}

export function NewConversationModal({ open, onClose, onCreate }: NewConversationModalProps) {
  const [type, setType] = useState<RoomType>("DIRECT");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<PublicUserDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useUserSearch(query);

  function toggleUser(user: PublicUserDto) {
    setSelected((prev) => {
      const exists = prev.some((item) => item.id === user.id);
      if (exists) return prev.filter((item) => item.id !== user.id);
      if (type === "DIRECT") return [user];
      return [...prev, user];
    });
  }

  function reset() {
    setQuery("");
    setName("");
    setSelected([]);
    setError(null);
  }

  async function handleCreate() {
    if (selected.length === 0) {
      setError("Select at least one person.");
      return;
    }
    if (type === "GROUP" && !name.trim()) {
      setError("A group room needs a name.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body: CreateRoomRequest = {
        type,
        participantIds: selected.map((user) => user.id),
      };
      if (type === "GROUP") {
        body.name = name.trim();
      }
      await onCreate(body);
      reset();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Conversation">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[rgba(95,141,78,0.2)] to-[rgba(164,190,123,0.1)] p-1">
          <button
            type="button"
            onClick={() => {
              setType("DIRECT");
              setSelected([]);
            }}
            className={`flex-1 rounded-xl px-3 py-2 text-sm transition-all ${
              type === "DIRECT"
                ? "bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] text-[var(--color-parchment)]"
                : "text-[rgba(229,217,182,0.7)]"
            }`}
          >
            Direct
          </button>
          <button
            type="button"
            onClick={() => setType("GROUP")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm transition-all ${
              type === "GROUP"
                ? "bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] text-[var(--color-parchment)]"
                : "text-[rgba(229,217,182,0.7)]"
            }`}
          >
            Group
          </button>
        </div>

        {type === "GROUP" && (
          <Input
            label="Group name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tea Circle"
            className="bg-[rgba(26,58,32,0.6)]"
          />
        )}

        <Input
          label="Search people"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type at least 2 characters"
          className="bg-[rgba(26,58,32,0.6)]"
        />

        {search.isFetching && <div className="text-xs text-[rgba(164,190,123,0.7)]">Searching…</div>}

        {search.data && search.data.length > 0 && (
          <div className="max-h-52 overflow-y-auto rounded-xl border border-[rgba(164,190,123,0.2)]">
            {search.data.map((user) => {
              const isSelected = selected.some((item) => item.id === user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[var(--color-parchment)] transition-colors hover:bg-[rgba(95,141,78,0.2)] ${
                    isSelected ? "bg-[rgba(95,141,78,0.25)]" : ""
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-fern)] to-[var(--color-forest)] text-xs font-semibold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{user.username}</div>
                    {user.description && (
                      <div className="truncate text-xs text-[rgba(164,190,123,0.7)]">{user.description}</div>
                    )}
                  </div>
                  {isSelected && <span className="text-xs text-[var(--color-sage)]">selected</span>}
                </button>
              );
            })}
          </div>
        )}

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((user) => (
              <span
                key={user.id}
                className="rounded-full bg-[rgba(95,141,78,0.25)] px-3 py-1 text-xs text-[var(--color-parchment)]"
              >
                {user.username}
              </span>
            ))}
          </div>
        )}

        {error && <div className="text-xs text-red-300">{error}</div>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[rgba(229,217,182,0.6)] hover:text-[var(--color-parchment)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-4 py-2 text-sm font-semibold text-[var(--color-parchment)] transition-all disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
