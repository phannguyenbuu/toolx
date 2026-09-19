import { create } from 'zustand';

interface ExperienceState {
  isExperienceReady: boolean;
  setIsExperienceReady: () => void;
}

export const useExperienceStore = create<ExperienceState>((set) => ({
  isExperienceReady: false,
  setIsExperienceReady: () => set({ isExperienceReady: true }),
}));
