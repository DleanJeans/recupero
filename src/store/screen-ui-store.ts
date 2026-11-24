import { create } from 'zustand';

export type TaskSort = 'oldest' | 'heat';
export type DayTab = 'logs' | 'metadata';
export type TaskTab = 'today' | 'shopping' | 'later';
/** Metadata tab scope: totals for the selected day, or the last 7 days against each daily goal. */
export type DayMetadataRange = 'day' | 'week';

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
  dayScreenMetadataRange: DayMetadataRange;
  setDayScreenMetadataRange: (range: DayMetadataRange) => void;
  taskScreenSelectedDate: string | null;
  setTaskScreenSelectedDate: (date: string) => void;
  taskScreenTab: TaskTab;
  setTaskScreenTab: (tab: TaskTab) => void;
  taskScreenSort: TaskSort;
  setTaskScreenSort: (sort: TaskSort) => void;
}

export const useScreenUiStore = create<ScreenUiStore>()(set => ({
  checklistStripExpanded: false,
  setChecklistStripExpanded: expanded => set({ checklistStripExpanded: expanded }),
  homeSelectedCategoryId: null,
  dayScreenSelectedDate: null,
  dayScreenSelectedTab: 'metadata',
  dayScreenMetadataRange: 'day',
  taskScreenSelectedDate: null,
  taskScreenTab: 'today',
  setTaskScreenTab: tab => set({ taskScreenTab: tab }),
  taskScreenSort: 'oldest',
  setTaskScreenSort: sort => set({ taskScreenSort: sort }),
  setHomeSelectedCategoryId: id => set({ homeSelectedCategoryId: id }),
  setDayScreenSelectedDate: date => set({ dayScreenSelectedDate: date }),
  setDayScreenSelectedTab: tab => set({ dayScreenSelectedTab: tab }),
  setDayScreenMetadataRange: range => set({ dayScreenMetadataRange: range }),
  setTaskScreenSelectedDate: date => set({ taskScreenSelectedDate: date }),
}));
