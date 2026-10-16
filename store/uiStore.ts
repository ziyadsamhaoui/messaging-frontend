import { create } from "zustand";
import { ConnectionState } from "@/lib/stompClient";

const SIDEBAR_STORAGE_KEY = "badrlink.sidebar-collapsed";
/** Wide viewports start expanded; narrower ones start collapsed, until the user chooses. */
const NARROW_QUERY = "(max-width: 1439px)";

function readStoredSidebar(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). The UI must still
    // render, so it simply falls back to the viewport default.
    return null;
  }
}

export function viewportDefaultCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia(NARROW_QUERY).matches;
  } catch {
    return false;
  }
}

function initialSidebarCollapsed(): boolean {
  const stored = readStoredSidebar();
  return stored ?? viewportDefaultCollapsed();
}

/**
 * Mirrors the collapsed state onto the document element. The rail's width, its
 * labels and its tooltips are all expressed from this attribute in CSS (see
 * `globals.css`), which is what lets the shell be painted in the right state
 * before React hydrates instead of snapping to width a frame later.
 */
export function applySidebarAttribute(collapsed: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
}

function persistSidebar(collapsed: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  } catch {
    // Persistence is a convenience; a failure must not break the toggle.
  }
}

export interface TypingPeer {
  userId: string;
  label: string;
}

interface UiState {
  socketState: ConnectionState;
  drafts: Record<string, string>;
  roomActivity: Record<string, string>;
  blockedRooms: Record<string, boolean>;
  /** The room whose details panel is open, if any. Not persisted: a reload starts closed. */
  detailsRoomId: string | null;
  sidebarCollapsed: boolean;
  /** False until the user toggles it, so a viewport change may still apply the default. */
  sidebarChosen: boolean;
  setSocketState: (state: ConnectionState) => void;
  setDraft: (roomId: string, value: string) => void;
  clearDraft: (roomId: string) => void;
  noteRoomActivity: (roomId: string, at: string) => void;
  markBlockedRoom: (roomId: string, blocked: boolean) => void;
  openDetails: (roomId: string) => void;
  closeDetails: () => void;
  setSidebarCollapsed: (collapsed: boolean, options?: { persist?: boolean }) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  socketState: "offline",
  drafts: {},
  roomActivity: {},
  blockedRooms: {},
  detailsRoomId: null,
  sidebarCollapsed: initialSidebarCollapsed(),
  sidebarChosen: readStoredSidebar() !== null,
  setSocketState: (socketState) => set({ socketState }),
  setDraft: (roomId, value) =>
    set((state) => ({ drafts: { ...state.drafts, [roomId]: value } })),
  clearDraft: (roomId) =>
    set((state) => {
      const drafts = { ...state.drafts };
      delete drafts[roomId];
      return { drafts };
    }),
  noteRoomActivity: (roomId, at) =>
    set((state) => ({ roomActivity: { ...state.roomActivity, [roomId]: at } })),
  markBlockedRoom: (roomId, blocked) =>
    set((state) => ({ blockedRooms: { ...state.blockedRooms, [roomId]: blocked } })),
  openDetails: (roomId) => set({ detailsRoomId: roomId }),
  closeDetails: () => set({ detailsRoomId: null }),
  setSidebarCollapsed: (collapsed, options) => {
    const persist = options?.persist ?? true;
    if (persist) persistSidebar(collapsed);
    applySidebarAttribute(collapsed);
    set({ sidebarCollapsed: collapsed, sidebarChosen: persist ? true : get().sidebarChosen });
  },
  toggleSidebar: () => get().setSidebarCollapsed(!get().sidebarCollapsed),
}));
