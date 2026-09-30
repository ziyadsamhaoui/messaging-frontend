"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { CreateConversationRequest, UserDTO } from "../../lib/types";
import { useAuth } from "../../lib/auth";
import { searchUsers } from "../../lib/api";

interface NewConversationModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (body: CreateConversationRequest) => Promise<void>;
}

export function NewConversationModal({ open, onClose, onCreate }: NewConversationModalProps) {
  const auth = useAuth();
  const [type, setType] = useState<"PRIVATE" | "GROUP">("PRIVATE");
  const [targetUsername, setTargetUsername] = useState("");
  const [participants, setParticipants] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserDTO[]>([]);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    if (!auth.token || type !== "PRIVATE") return undefined;
    let active = true;
    const trimmed = targetUsername.trim();

    const handle = setTimeout(async () => {
      if (!active) return;
      if (trimmed.length < 2) {
        setResults([]);
        setResultsOpen(false);
        setResultsLoading(false);
        return;
      }
      try {
        setResultsLoading(true);
        const users = await searchUsers(auth.token, trimmed);
        if (!active) return;
        setResults(users);
        setResultsOpen(true);
      } catch {
        if (!active) return;
        setResults([]);
        setResultsOpen(false);
      } finally {
        if (!active) return;
        setResultsLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [auth.token, targetUsername, type]);

  async function handleCreate() {
    setLoading(true);
    try {
      if (type === "PRIVATE") {
        await onCreate({ type, targetUsername: targetUsername.trim() });
      } else {
        const list = participants
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        await onCreate({ type, participantUsernames: list, name: name.trim() || undefined });
      }
      onClose();
      setTargetUsername("");
      setParticipants("");
      setName("");
      setResults([]);
      setResultsOpen(false);
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
            onClick={() => setType("PRIVATE")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm transition-all ${
              type === "PRIVATE"
                ? "bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] text-[var(--color-parchment)]"
                : "text-[rgba(229,217,182,0.7)]"
            }`}
          >
            Private
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

        {type === "PRIVATE" ? (
          <div className="relative">
            <Input
              label="Target username"
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setResultsOpen(true);
              }}
              placeholder="e.g. fernwalker"
              className="bg-[rgba(26,58,32,0.6)]"
            />
            {resultsOpen && (resultsLoading || results.length > 0) && (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[rgba(164,190,123,0.2)] bg-[rgba(26,58,32,0.95)] shadow-xl">
                {resultsLoading ? (
                  <div className="px-3 py-2 text-xs text-[rgba(164,190,123,0.7)]">Searching...</div>
                ) : (
                  results.map((user) => (
                    <button
                      key={user.userId}
                      type="button"
                      onClick={() => {
                        setTargetUsername(user.username);
                        setResultsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[var(--color-parchment)] transition-colors hover:bg-[rgba(95,141,78,0.2)]"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-fern)] to-[var(--color-forest)] text-xs font-semibold">
                        {user.displayName?.charAt(0)?.toUpperCase() || user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm">{user.displayName || user.username}</div>
                        <div className="text-xs text-[rgba(164,190,123,0.7)]">@{user.username}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <Input
              label="Group name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tea Circle"
              className="bg-[rgba(26,58,32,0.6)]"
            />
            <Input
              label="Participants (comma-separated)"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="sage, moss, river"
              className="bg-[rgba(26,58,32,0.6)]"
            />
            <p className="text-xs text-[rgba(164,190,123,0.7)]">Max 50 participants.</p>
          </>
        )}

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
            className="rounded-xl bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-4 py-2 text-sm font-semibold text-[var(--color-parchment)] transition-all hover:scale-[1.02] disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

