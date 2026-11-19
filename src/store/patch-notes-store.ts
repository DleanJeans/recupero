import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PatchNotesState {
  /** Bullet texts DJ has ticked off as tested. */
  checked: string[];
  toggle: (text: string) => void;
}

export const usePatchNotesStore = create<PatchNotesState>()(
  persist(
    set => ({
      checked: [],
      toggle: text =>
        set(state => ({
          checked: state.checked.includes(text) ? state.checked.filter(t => t !== text) : [...state.checked, text],
        })),
    }),
    { name: 'recupero-patch-notes', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
