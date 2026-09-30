"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Client, IMessage } from "@stomp/stompjs";
import { useAuth } from "../../lib/auth";
import { useConversations } from "../../hooks/useConversations";
import { useMessages } from "../../hooks/useMessages";
import { useStomp } from "../../hooks/useStomp";
import { ConversationDTO, MessageDTO, UserDTO } from "../../lib/types";
import { createConversation, sendMessage, ApiError, searchUsers } from "../../lib/api";
import { AppShell } from "../../components/layout/AppShell";
import { ConversationItem } from "../../components/sidebar/ConversationItem";
import { NewConversationModal } from "../../components/sidebar/NewConversationModal";
import { MessageList } from "../../components/chat/MessageList";
import { MessageInput } from "../../components/chat/MessageInput";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { Modal } from "../../components/ui/Modal";

export default function MessagingApp() {
  const router = useRouter();
  const auth = useAuth();
  const toast = useToast();
  const [selected, setSelected] = useState<ConversationDTO | null>(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDisplayName, setSettingsDisplayName] = useState(auth.username || "");
  const [settingsEmail, setSettingsEmail] = useState("");
  const [settingsPassword, setSettingsPassword] = useState("");
  const [settingsPasswordConfirm, setSettingsPasswordConfirm] = useState("");
  const [settingsAvatarName, setSettingsAvatarName] = useState("");
  const [userResults, setUserResults] = useState<UserDTO[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const { items: conversations, loading: loadingConversations, nextCursor, loadMore, setItems } =
    useConversations(auth.token);

  const { items: messages, loading: loadingMessages, nextCursor: messageCursor, loadMore: loadMoreMessages, appendMessage, setItems: setMessageItems } =
    useMessages(auth.token, selected?.conversationId ?? null);

  const updateConversationLastMessage = useCallback(
    (conversationId: number, message: MessageDTO) => {
      setItems((prev) =>
        prev.map((conversation) =>
          conversation.conversationId === conversationId
            ? { ...conversation, lastMessage: message }
            : conversation
        )
      );
    },
    [setItems]
  );

  // Stable onConnect handler: subscribe to global topics here. Per-conversation subscriptions
  // are handled in the separate useEffect below to avoid recreating the STOMP client
  // whenever `selected` changes (which was causing re-initialization loops).
  const handleStompConnect = useCallback(
    (client: Client) => {
      client.subscribe("/user/queue/errors", (message: IMessage) => {
        try {
          const payload = JSON.parse(message.body);
          toast.push(payload.message || "An error occurred", payload.status === 200 ? "success" : "error");
          if (payload.status === 401) {
            auth.logout();
            router.push("/login");
          }
        } catch {
          toast.push("WebSocket error", "error");
        }
      });

      client.subscribe("/topic/conversations", (message: IMessage) => {
        try {
          const convo = JSON.parse(message.body) as ConversationDTO;
          setItems((prev) => {
            if (prev.some((c) => c.conversationId === convo.conversationId)) return prev;
            return [convo, ...prev];
          });
        } catch {
          // ignore parse errors
        }
      });
    },
    [auth, router, setItems, toast]
  );

  const { subscribe } = useStomp({
    token: auth.token,
    onError: (msg) => toast.push(msg, "error"),
    onConnect: handleStompConnect,
  });

  useEffect(() => {
    if (!selected) return;
    setMessageItems([]);
    const sub = subscribe(`/topic/conversations/${selected.conversationId}`, (message) => {
      const msg = JSON.parse(message.body) as MessageDTO;
      appendMessage(msg);
      updateConversationLastMessage(selected.conversationId, msg);
    });
    return () => {
      sub?.unsubscribe();
    };
  }, [selected?.conversationId, subscribe, appendMessage, setMessageItems, selected, updateConversationLastMessage]);

  useEffect(() => {
    if (!auth.token) {
      router.push("/login");
    }
  }, [auth.token, router]);

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter((c) => {
      const title = c.name || c.participants.map((p) => p.displayName || p.username).join(", ");
      return title.toLowerCase().includes(q);
    });
  }, [conversations, query]);

  useEffect(() => {
    if (!auth.token) return undefined;
    let active = true;
    const trimmed = query.trim();

    const handle = setTimeout(async () => {
      if (!active) return;
      if (trimmed.length < 2) {
        setUserResults([]);
        setSearchOpen(false);
        setSearchLoading(false);
        return;
      }

      try {
        setSearchLoading(true);
        const results = await searchUsers(auth.token, trimmed);
        if (!active) return;
        setUserResults(results);
        setSearchOpen(true);
      } catch {
        if (!active) return;
        setUserResults([]);
        setSearchOpen(false);
      } finally {
        if (!active) return;
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [auth.token, query]);

  const currentUsername = auth.username || "username";
  const currentDisplayName = currentUsername;
  const currentEmailPlaceholder = currentUsername.includes("@") ? currentUsername : "you@example.com";
  const currentInitial = currentDisplayName.charAt(0).toUpperCase();
  const selectedParticipant = selected?.participants.find((p) => p.userId !== auth.userId) ?? selected?.participants[0];
  const selectedDisplayName = selected?.name || selectedParticipant?.displayName || selectedParticipant?.username || "Conversation";
  const selectedInitial = selectedDisplayName.charAt(0).toUpperCase();

  if (!auth.token) {
    return null;
  }

  async function handleCreate(body: Parameters<typeof createConversation>[1]) {
    if (!auth.token) return;
    try {
      const conversation = await createConversation(auth.token, body);
      setItems((prev) => {
        if (prev.some((c) => c.conversationId === conversation.conversationId)) return prev;
        return [conversation, ...prev];
      });
      setSelected(conversation);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.push(err.payload?.message || err.message, "error");
      } else {
        toast.push("Failed to create conversation", "error");
      }
    }
  }

  async function handleSend(content: string) {
    if (!auth.token || !selected) return;
    try {
      const msg = await sendMessage(auth.token, selected.conversationId, content);
      appendMessage(msg);
      updateConversationLastMessage(selected.conversationId, msg);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.push(err.payload?.message || err.message, "error");
      } else {
        toast.push("Failed to send message", "error");
      }
    }
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-[rgba(229,217,182,0.1)] px-5 py-3">
        <Link href="/frontend/public" className="flex items-center gap-3">
          <Image
            src="/favicon.png"
            width={60}
            height={60}
            alt="BadrLink favicon"
            className="inline-block"
          />
          <div className="font-display text-4xl text-transparent bg-gradient-to-r from-[var(--color-parchment)] to-[var(--color-sage)] bg-clip-text">
            BadrLink
          </div>
        </Link>
      </div>
      <div className="px-4 pt-6">
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (userResults.length > 0) setSearchOpen(true);
            }}
            placeholder="Search"
            className="rounded-xl h-12 border text-lg border-[rgba(164,190,123,0.15)] bg-gradient-to-r from-[rgba(46,94,55,0.6)] to-[rgba(95,141,78,0.2)] text-[var(--color-parchment)] placeholder:text-[rgba(164,190,123,0.5)]"
          />
          {searchOpen && (searchLoading || userResults.length > 0) && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[rgba(164,190,123,0.2)] bg-[rgba(26,58,32,0.95)] shadow-xl">
              {searchLoading ? (
                <div className="px-3 py-2 text-xs text-[rgba(164,190,123,0.7)]">Searching...</div>
              ) : (
                userResults.map((user) => (
                  <button
                    key={user.userId}
                    type="button"
                    onClick={() => {
                      setQuery(user.username);
                      setSearchOpen(false);
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
      </div>
      <div className="px-4 pt-3">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full h-13 rounded-xl bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-4 py-2 text-lg font-medium text-[var(--color-parchment)] transition-all hover:scale-[1.02] hover:shadow-[0_8px_20px_rgba(95,141,78,0.2)] active:scale-[0.98]"
        >
          + New Chat
        </button>
      </div>
      <div className="mt-3 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {loadingConversations && conversations.length === 0 ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 text-lg text-[rgba(164,190,123,0.6)]">No conversations yet.</div>
        ) : (
          filtered.map((conversation) => (
            <ConversationItem
              key={conversation.conversationId}
              conversation={conversation}
              currentUserId={auth.userId}
              active={selected?.conversationId === conversation.conversationId}
              onClick={() => setSelected(conversation)}
            />
          ))
        )}
      </div>
      {nextCursor && (
        <button
          type="button"
          onClick={() => loadMore()}
          className="mx-4 mb-4 rounded-xl border border-[rgba(229,217,182,0.25)] px-4 py-2 text-sm text-[rgba(229,217,182,0.7)] transition-all hover:bg-[rgba(229,217,182,0.08)]"
        >
          Load more
        </button>
      )}
      <div className="mt-auto border-t border-[rgba(229,217,182,0.1)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-fern)] to-[var(--color-forest)] text-lg font-semibold text-[var(--color-parchment)]">
              {currentInitial}
            </div>
            <div>
              <div className="text-lg font-semibold text-[var(--color-parchment)]">{currentDisplayName}</div>
              <div className="text-sm text-[rgba(164,190,123,0.7)]">{currentUsername}</div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-transparent text-[var(--color-forest)] transition-transform duration-300 hover:rotate-90"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-[var(--color-forest)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.75a3.25 3.25 0 0 0-3.25 3.25v5a3.25 3.25 0 1 0 6.5 0v-5A3.25 3.25 0 0 0 12 2.75Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.75 11.5v.5a6.25 6.25 0 0 0 12.5 0v-.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.25v2.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  const mainContent = (
    <div className="flex h-full flex-col bg-gradient-to-br from-[rgba(229,217,182,0.95)] to-[rgba(212,200,158,0.9)]">
      <header className="flex items-center justify-between border-b border-[rgba(40,84,48,0.15)] bg-gradient-to-r from-[rgba(212,200,158,0.9)] to-[rgba(229,217,182,0.95)] px-6 py-4">
        {selected ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-fern)] to-[var(--color-forest)] text-sm font-semibold text-[var(--color-parchment)]">
              {selectedInitial}
            </div>
            <div>
              <div className="font-display text-base text-[var(--color-forest)]">{selectedDisplayName}</div>
              <div className="text-xs text-[rgba(95,141,78,0.7)]">
                {selected.type === "GROUP" ? "Group chat" : "Private chat"}
              </div>
            </div>
          </div>
        ) : (
          <div />
        )}
      </header>

      {selected ? (
        <>
          <MessageList
            messages={messages}
            currentUserId={auth.userId}
            loading={loadingMessages}
            hasMore={Boolean(messageCursor)}
            onLoadMore={loadMoreMessages}
          />
          <MessageInput onSend={handleSend} />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-[rgba(40,84,48,0.7)]">
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-fern)] to-[var(--color-forest)] animate-pulse">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-15 w-15 text-[var(--color-parchment)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
            </svg>
          </div>
          <div className="text-2xl font-semibold text-[var(--color-forest)]">No chat selected</div>
          <div className="text-xl text-[rgba(40,84,48,0.6)]">Choose one from the sidebar to start messaging</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen">
      <div className="lg:hidden h-full">
        {!selected ? (
          <div className="h-full">{sidebarContent}</div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b border-[rgba(40,84,48,0.15)] bg-gradient-to-r from-[rgba(212,200,158,0.9)] to-[rgba(229,217,182,0.95)] px-4 py-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border border-[rgba(40,84,48,0.2)] px-3 py-1 text-xs text-[rgba(40,84,48,0.7)]"
              >
                ← Back
              </button>
              <div className="text-sm text-[rgba(40,84,48,0.7)]">Conversation</div>
            </div>
            {mainContent}
          </div>
        )}
      </div>

      <div className="hidden h-full lg:block">
        <AppShell sidebar={sidebarContent} main={mainContent} />
      </div>

      <NewConversationModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} />
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-fern)] to-[var(--color-forest)] text-xl font-semibold text-[var(--color-parchment)]">
              {currentInitial}
              <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[rgba(229,217,182,0.3)] bg-[rgba(40,84,48,0.9)]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSettingsAvatarName(e.target.files?.[0]?.name || "")}
                  className="hidden"
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-[var(--color-parchment)] rotate-[60deg]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 0 1 2.97 2.97L8.25 19.04l-4.25 1.06 1.06-4.25L16.862 4.487Z" />
                </svg>
              </label>
            </div>
            <div className="text-sm text-[rgba(164,190,123,0.7)]">
              {settingsAvatarName ? `Selected: ${settingsAvatarName}` : "Choose an avatar"}
            </div>
          </div>
          <Input
            label="Display name"
            value={settingsDisplayName}
            onChange={(e) => setSettingsDisplayName(e.target.value)}
            placeholder="Your name"
            className="bg-[rgba(26,58,32,0.6)]"
          />
          <Input
            label="Email"
            value={settingsEmail}
            onChange={(e) => setSettingsEmail(e.target.value)}
            placeholder={currentEmailPlaceholder}
            className="bg-[rgba(26,58,32,0.6)]"
          />
          <Input
            label="Password"
            type="password"
            value={settingsPassword}
            onChange={(e) => setSettingsPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-[rgba(26,58,32,0.6)]"
          />
          <Input
            label="Confirm password"
            type="password"
            value={settingsPasswordConfirm}
            onChange={(e) => setSettingsPasswordConfirm(e.target.value)}
            placeholder="••••••••"
            className="bg-[rgba(26,58,32,0.6)]"
          />
          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                auth.logout();
                router.push("/login");
              }}
              className="rounded-xl border border-[rgba(229,217,182,0.25)] px-4 py-2 text-sm text-[rgba(229,217,182,0.8)] transition-all hover:bg-[rgba(229,217,182,0.08)]"
            >
              Logout
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="text-sm text-[rgba(229,217,182,0.6)] hover:text-[var(--color-parchment)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.push("Settings saved", "success");
                  setSettingsOpen(false);
                }}
                className="rounded-xl bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-4 py-2 text-sm font-semibold text-[var(--color-parchment)] transition-all hover:scale-[1.02]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
