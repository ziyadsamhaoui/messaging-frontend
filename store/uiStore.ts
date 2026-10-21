import { create } from "zustand";
import { ConnectionState } from "@/lib/stompClient";

const SIDEBAR_STORAGE_KEY = "badrlink.sidebar-collapsed";
const NARROW_QUERY = "(max-width: 1439px)";

const PANEL_WIDTH_STORAGE_KEY = "badrlink.panel-width";
export const PANEL_WIDTH_DEFAULT = 340;
export const PANEL_WIDTH_MIN = 280;
export const PANEL_WIDTH_MAX = 480;
export const PANEL_RESIZE_MIN_VIEWPORT = 1024;
export const PANEL_WIDTH_NARROW = 300;
const PANEL_MAX_VIEWPORT_SHARE = 0.4;

export function panelWidthCeiling(viewportWidth: number): number {
  return Math.max(
    PANEL_WIDTH_MIN,
    Math.min(PANEL_WIDTH_MAX, Math.round(viewportWidth * PANEL_MAX_VIEWPORT_SHARE))
  );
}

export function clampPanelWidth(value: number, viewportWidth: number): number {
  const rounded = Math.round(Number.isFinite(value) ? value : PANEL_WIDTH_DEFAULT);
  return Math.min(Math.max(rounded, PANEL_WIDTH_MIN), panelWidthCeiling(viewportWidth));
}

export function isPanelResizable(viewportWidth: number): boolean {
  return viewportWidth >= PANEL_RESIZE_MIN_VIEWPORT;
}

function readStoredPanelWidth(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(Math.max(Math.round(parsed), PANEL_WIDTH_MIN), PANEL_WIDTH_MAX);
  } catch {
    return null;
  }
}

function persistPanelWidth(width: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(width));
  } catch {
  }
}

function readStoredSidebar(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  } catch {
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

export function applySidebarAttribute(collapsed: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
}

export function applyPanelWidth(width: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--app-panel-width", `${width}px`);
  document.documentElement.dataset.panelWidth = String(width);
}

function persistSidebar(collapsed: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  } catch {
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
  detailsRoomId: string | null;
  sidebarCollapsed: boolean;
  sidebarChosen: boolean;
  panelWidth: number;
  setPanelWidth: (width: number, options?: { persist?: boolean }) => void;
  resetPanelWidth: () => void;
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
  panelWidth: readStoredPanelWidth() ?? PANEL_WIDTH_DEFAULT,
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
  setPanelWidth: (width, options) => {
    const persist = options?.persist ?? true;
    const preference = Math.min(Math.max(Math.round(width), PANEL_WIDTH_MIN), PANEL_WIDTH_MAX);
    if (persist) persistPanelWidth(preference);
    set({ panelWidth: preference });
  },
  resetPanelWidth: () => {
    persistPanelWidth(PANEL_WIDTH_DEFAULT);
    set({ panelWidth: PANEL_WIDTH_DEFAULT });
  },
}));
