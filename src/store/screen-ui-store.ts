import { create } from 'zustand';

interface ScreenUiStore {
  homeSelectedCategoryId: string | null;
  setHomeSelectedCategoryId: (id: string | null) => void;
  dayScreenSelectedDate: string | null;
  setDayScreenSelectedDate: (date: string) => void;
  taskScreenSelectedDate: string | null;
  setTaskScreenSelectedDate: (date: string) => void;
}

export const useScreenUiStore = create<ScreenUiStore>()(set => ({
  homeSelectedCategoryId: null,
  dayScreenSelectedDate: null,
  taskScreenSelectedDate: null,
  setHomeSelectedCategoryId: id => set({ homeSelectedCategoryId: id }),
  setDayScreenSelectedDate: date => set({ dayScreenSelectedDate: date }),
  setTaskScreenSelectedDate: date => set({ taskScreenSelectedDate: date }),
}));
