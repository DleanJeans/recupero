import { create } from 'zustand';

interface BehaviorActionSheetState {
  /** Behaviour whose long-press menu is open, if any. */
  behaviorId: string | null;
  open: (behaviorId: string) => void;
  close: () => void;
}

/** Long-press menu (Edit, Archive, Delete) for a behaviour card. Not persisted. */
export const useBehaviorActionSheetStore = create<BehaviorActionSheetState>(set => ({
  behaviorId: null,
  open: behaviorId => set({ behaviorId }),
  close: () => set({ behaviorId: null }),
}));
