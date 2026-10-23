"use client";

import { create } from "zustand";

export interface ProfileDraft {
  username: string;
  description: string;
  pictureUrl: string | null;
}

interface ProfileDraftState {
  draft: ProfileDraft | null;
  setDraft: (draft: ProfileDraft | null) => void;
}

export const useProfileDraftStore = create<ProfileDraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
}));
