import { create } from "zustand";
import { ConnectionState } from "@/lib/stompClient";
import { InvitationDraft } from "@/lib/types";

interface UiState {
  selectedRoomId: string | null;
  drafts: Record<string, string>;
  roomActivity: Record<string, string>;
  socketState: ConnectionState;
  sidebarOpen: boolean;
  detailsOpen: boolean;
  pendingInvitations: InvitationDraft[];
  blockedRooms: Record<string, boolean>;
  selectRoom: (roomId: string | null) => void;
  setDraft: (roomId: string, value: string) => void;
  clearDraft: (roomId: string) => void;
  noteRoomActivity: (roomId: string, at: string) => void;
  setSocketState: (state: ConnectionState) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDetails: () => void;
  addInvitation: (invitation: InvitationDraft) => void;
  removeInvitation: (invitationId: string) => void;
  markBlockedRoom: (roomId: string, blocked: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedRoomId: null,
  drafts: {},
  roomActivity: {},
  socketState: "offline",
  sidebarOpen: false,
  detailsOpen: false,
  pendingInvitations: [],
  blockedRooms: {},
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
  addInvitation: (invitation) =>
    set((state) => {
      if (state.pendingInvitations.some((item) => item.invitationId === invitation.invitationId)) {
        return state;
      }
      return { pendingInvitations: [invitation, ...state.pendingInvitations] };
    }),
  removeInvitation: (invitationId) =>
    set((state) => ({
      pendingInvitations: state.pendingInvitations.filter(
        (item) => item.invitationId !== invitationId
      ),
    })),
  markBlockedRoom: (roomId, blocked) =>
    set((state) => ({ blockedRooms: { ...state.blockedRooms, [roomId]: blocked } })),
}));
