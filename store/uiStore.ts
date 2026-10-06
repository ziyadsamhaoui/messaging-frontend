import { create } from "zustand";
import { ConnectionState } from "@/lib/stompClient";

interface UiState {
  selectedRoomId: string | null;
  drafts: Record<string, string>;
  roomActivity: Record<string, string>;
  socketState: ConnectionState;
  sidebarOpen: boolean;
  detailsOpen: boolean;
  selectRoom: (roomId: string | null) => void;
  setDraft: (roomId: string, value: string) => void;
  clearDraft: (roomId: string) => void;
  noteRoomActivity: (roomId: string, at: string) => void;
  setSocketState: (state: ConnectionState) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDetails: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedRoomId: null,
  drafts: {},
  roomActivity: {},
  socketState: "offline",
  sidebarOpen: false,
  detailsOpen: false,
  selectRoom: (roomId) => set({ selectedRoomId: roomId, sidebarOpen: false }),
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
  setSocketState: (socketState) => set({ socketState }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleDetails: () => set((state) => ({ detailsOpen: !state.detailsOpen })),
}));
