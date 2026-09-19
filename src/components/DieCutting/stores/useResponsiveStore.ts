import { create } from 'zustand';

interface ResponsiveState {
  isMobile: boolean;
  screenWidth: number;
  screenHeight: number;
  updateDimensions: () => void;
}

export const useResponsiveStore = create<ResponsiveState>((set) => ({
  isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
  screenHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
  updateDimensions: () =>
    set({
      isMobile: window.innerWidth < 768,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    }),
}));
