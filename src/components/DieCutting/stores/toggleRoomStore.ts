import { create } from 'zustand';

interface ToggleRoomState {
  isDarkRoom: boolean;
  isTransitioning: boolean;
  isBeforeZooming: boolean;
  setDarkRoom: (val: boolean) => void;
  setIsTransitioning: (val: boolean) => void;
  setIsBeforeZooming: (val: boolean) => void;
}

export const useToggleRoomStore = create<ToggleRoomState>((set) => ({
  isDarkRoom: true,
  isTransitioning: false,
  isBeforeZooming: false,
  setDarkRoom: (val: boolean) => set({ isDarkRoom: val }),
  setIsTransitioning: (val: boolean) => set({ isTransitioning: val }),
  setIsBeforeZooming: (val: boolean) => set({ isBeforeZooming: val }),
}));
