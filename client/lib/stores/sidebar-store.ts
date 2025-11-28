import { create } from "zustand";

interface SidebarState {
  isOpen: boolean;
  lastShowId: string | null;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setLastShowId: (id: string | null) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  lastShowId: null,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setLastShowId: (id) => set({ lastShowId: id }),
}));
