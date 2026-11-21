import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type DraftIngredient = { key: string; behaviorId: string; amountText: string };

/** What was typed on the "Cook a meal" screen but not created yet. */
export interface MealBatchDraft {
  name: string;
  emoji: string;
  rows: DraftIngredient[];
  cookedText: string;
  cookedEdited: boolean;
  portionsText: string;
  baseBehaviorId?: string;
}

export const EMPTY_MEAL_BATCH_DRAFT: MealBatchDraft = {
  name: '',
  emoji: '🍲',
  rows: [],
  cookedText: '',
  cookedEdited: false,
  portionsText: '',
};

interface MealBatchDraftStore {
  draft: MealBatchDraft;
  setDraft: (draft: MealBatchDraft) => void;
  clearDraft: () => void;
}

/** Keeps a new meal's form across leaving the screen (ingredient timers, picker) and app restarts. */
export const useMealBatchDraftStore = create<MealBatchDraftStore>()(
  persist(
    set => ({
      draft: EMPTY_MEAL_BATCH_DRAFT,
      setDraft: draft => set({ draft }),
      clearDraft: () => set({ draft: EMPTY_MEAL_BATCH_DRAFT }),
    }),
    { name: 'meal-batch-draft', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
