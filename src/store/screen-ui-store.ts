import { create } from 'zustand';

export type DayTab = 'logs' | 'metadata';

interface ScreenUiStore {
  /** Routines checklist strip: true shows full cards, false shows slim pills. Resets to pills on app start. */
  checklistStripExpanded: boolean;
  setChecklistStripExpanded: (expanded: boolean) => void;
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
  checklistStripExpanded: false,
  setChecklistStripExpanded: expanded => set({ checklistStripExpanded: expanded }),
  homeSelectedCategoryId: null,
  dayScreenSelectedDate: null,
  dayScreenSelectedTab: 'metadata',
  taskScreenSelectedDate: null,
  setHomeSelectedCategoryId: id => set({ homeSelectedCategoryId: id }),
  setDayScreenSelectedDate: date => set({ dayScreenSelectedDate: date }),
  setDayScreenSelectedTab: tab => set({ dayScreenSelectedTab: tab }),
  setTaskScreenSelectedDate: date => set({ taskScreenSelectedDate: date }),
}));
