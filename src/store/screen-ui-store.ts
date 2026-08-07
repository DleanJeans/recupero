import { create } from 'zustand';

export type DayTab = 'logs' | 'metadata';

interface ScreenUiStore {
  homeSelectedCategoryId: string | null;
  setHomeSelectedCategoryId: (id: string | null) => void;
  dayScreenSelectedDate: string | null;
  setDayScreenSelectedDate: (date: string) => void;
  dayScreenSelectedTab: DayTab;
  setDayScreenSelectedTab: (tab: DayTab) => void;
  taskScreenSelectedDate: string | null;
  setTaskScreenSelectedDate: (date: string) => void;
}

export const useScreenUiStore = create<ScreenUiStore>()(set => ({
  homeSelectedCategoryId: null,
  dayScreenSelectedDate: null,
  dayScreenSelectedTab: 'logs',
  taskScreenSelectedDate: null,
  setHomeSelectedCategoryId: id => set({ homeSelectedCategoryId: id }),
  setDayScreenSelectedDate: date => set({ dayScreenSelectedDate: date }),
  setDayScreenSelectedTab: tab => set({ dayScreenSelectedTab: tab }),
  setTaskScreenSelectedDate: date => set({ taskScreenSelectedDate: date }),
}));
