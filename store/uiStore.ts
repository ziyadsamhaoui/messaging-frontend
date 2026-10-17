import { create } from "zustand";
import { ConnectionState } from "@/lib/stompClient";

const SIDEBAR_STORAGE_KEY = "badrlink.sidebar-collapsed";
/** Wide viewports start expanded; narrower ones start collapsed, until the user chooses. */
const NARROW_QUERY = "(max-width: 1439px)";

const PANEL_WIDTH_STORAGE_KEY = "badrlink.panel-width";
/** The section panel's default, floor and absolute ceiling, in px. */
export const PANEL_WIDTH_DEFAULT = 340;
export const PANEL_WIDTH_MIN = 280;
export const PANEL_WIDTH_MAX = 480;
/** Below this viewport width the panel is a fixed 300 px and cannot be dragged. */
export const PANEL_RESIZE_MIN_VIEWPORT = 1024;
export const PANEL_WIDTH_NARROW = 300;
/** The panel may never take more than this share of the viewport. */
const PANEL_MAX_VIEWPORT_SHARE = 0.4;

/**
 * The largest width the panel may take on a viewport of this size: 480 px, or 40% of
 * the viewport, whichever is smaller.
 */
export function panelWidthCeiling(viewportWidth: number): number {
  return Math.max(
    PANEL_WIDTH_MIN,
    Math.min(PANEL_WIDTH_MAX, Math.round(viewportWidth * PANEL_MAX_VIEWPORT_SHARE))
  );
}

/** Rounds and clamps a width to the floor and to the current viewport's ceiling. */
export function clampPanelWidth(value: number, viewportWidth: number): number {
  const rounded = Math.round(Number.isFinite(value) ? value : PANEL_WIDTH_DEFAULT);
  return Math.min(Math.max(rounded, PANEL_WIDTH_MIN), panelWidthCeiling(viewportWidth));
}

/** The handle is only operable at and above the minimum viewport width. */
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
    // Storage can be unavailable (private mode, blocked cookies). The UI must still
    // render, so it falls back to the default width.
    return null;
  }
}

function persistPanelWidth(width: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(width));
  } catch {
    // Persistence is a convenience; a failure must not break the resize.
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

/**
 * Mirrors the section panel's width onto the document element, for the same reason the
 * sidebar state lives there: `--app-panel-width` is read by the panel's CSS, and the
 * bootstrap script in the root layout writes it before the first paint, so a reload
 * paints the remembered width instead of snapping to it once React catches up.
 */
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
  /**
   * The section panel's width, in px, as the user chose it.
   *
   * This is the *preference*, not the width currently on screen: the applied width is
   * this value clamped to the present viewport's ceiling (see `panelWidthCeiling`). The
   * two are kept apart so that narrowing the window narrows the panel without
   * destroying a wider preference chosen on a larger screen.
   */
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
    // Clamped against the STATIC floor and ceiling here, so the stored preference is a
    // width the user could legitimately have chosen on some viewport. The viewport's
    // own (possibly smaller) ceiling is applied where the width is rendered.
    const preference = Math.min(Math.max(Math.round(width), PANEL_WIDTH_MIN), PANEL_WIDTH_MAX);
    if (persist) persistPanelWidth(preference);
    set({ panelWidth: preference });
  },
  resetPanelWidth: () => {
    persistPanelWidth(PANEL_WIDTH_DEFAULT);
    set({ panelWidth: PANEL_WIDTH_DEFAULT });
  },
}));
