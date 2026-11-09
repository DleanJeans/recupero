import { create } from 'zustand';

interface ChecklistSelectionState {
  /** True while Routines is in select mode, picking behaviours for a new checklist. */
  active: boolean;
  /** Selected behaviour ids, in the order they were tapped. */
  behaviorIds: string[];
  start: (behaviorId: string) => void;
  toggle: (behaviorId: string) => void;
  clear: () => void;
}

/** Select mode on Routines (long-press > Select). Not persisted. */
export const useChecklistSelectionStore = create<ChecklistSelectionState>(set => ({
  active: false,
  behaviorIds: [],
  start: behaviorId => set({ active: true, behaviorIds: [behaviorId] }),
  toggle: behaviorId =>
    set(state => ({
      behaviorIds: state.behaviorIds.includes(behaviorId)
        ? state.behaviorIds.filter(id => id !== behaviorId)
        : [...state.behaviorIds, behaviorId],
    })),
  clear: () => set({ active: false, behaviorIds: [] }),
}));
