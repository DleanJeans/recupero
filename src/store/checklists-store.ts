import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Checklist, ChecklistItemInput, ChecklistRun, ChecklistTick } from '../types/checklist';

export const CHECKLISTS_STORAGE_KEY = 'recupero-checklists';

export interface ChecklistInput {
  name: string;
  emoji?: string;
  items: ChecklistItemInput[];
}

export interface ChecklistsStore {
  checklists: Checklist[];
  /** Latest run per checklist id. A run from an earlier day counts as not started. */
  runs: Record<string, ChecklistRun>;
  addChecklist: (input: ChecklistInput) => string;
  updateChecklist: (id: string, input: ChecklistInput) => void;
  removeChecklist: (id: string) => void;
  /** Returns today's run for the checklist, starting a new one if the saved run is from another day. */
  ensureRun: (checklistId: string, today: string) => ChecklistRun;
  setTick: (checklistId: string, itemId: string, tick: ChecklistTick | undefined) => void;
  /** Marks today's run finished (Finish pressed, or every item ticked or skipped). */
  finishRun: (checklistId: string, at?: number) => void;
}

/** Keeps item ids stable when an item (same behaviour or same plain label) survives an edit, so today's ticks stay. */
function withItemIds(previous: Checklist | undefined, items: ChecklistItemInput[]): Checklist['items'] {
  const unused = [...(previous?.items ?? [])];
  return items.map(item => {
    const matchIndex = unused.findIndex(candidate =>
      item.kind === 'behavior'
        ? candidate.kind === 'behavior' && candidate.behaviorId === item.behaviorId
        : candidate.kind === 'plain' && candidate.label === item.label,
    );
    const id = matchIndex >= 0 ? unused.splice(matchIndex, 1)[0].id : uuidv4();
    return { ...item, id };
  });
}

export const useChecklistsStore = create<ChecklistsStore>()(
  persist(
    (set, get) => ({
      checklists: [],
      runs: {},
      addChecklist: input => {
        const id = uuidv4();
        set(state => ({
          checklists: [
            ...state.checklists,
            {
              id,
              name: input.name,
              emoji: input.emoji || undefined,
              items: withItemIds(undefined, input.items),
              createdAt: Date.now(),
            },
          ],
        }));
        return id;
      },
      updateChecklist: (id, input) =>
        set(state => ({
          checklists: state.checklists.map(checklist =>
            checklist.id === id
              ? {
                  ...checklist,
                  name: input.name,
                  emoji: input.emoji || undefined,
                  items: withItemIds(checklist, input.items),
                }
              : checklist,
          ),
        })),
      removeChecklist: id =>
        set(state => {
          const { [id]: _removed, ...runs } = state.runs;
          return { checklists: state.checklists.filter(checklist => checklist.id !== id), runs };
        }),
      ensureRun: (checklistId, today) => {
        const existing = get().runs[checklistId];
        if (existing && existing.date === today) return existing;
        const run: ChecklistRun = { date: today, startedAt: Date.now(), stackId: uuidv4(), ticks: {} };
        set(state => ({ runs: { ...state.runs, [checklistId]: run } }));
        return run;
      },
      setTick: (checklistId, itemId, tick) =>
        set(state => {
          const run = state.runs[checklistId];
          if (!run) return state;
          const ticks = { ...run.ticks };
          if (tick) ticks[itemId] = tick;
          else delete ticks[itemId];
          // Unticking reopens a finished run.
          const { finishedAt, ...rest } = run;
          const next = tick && finishedAt != null ? { ...rest, finishedAt, ticks } : { ...rest, ticks };
          return { runs: { ...state.runs, [checklistId]: next } };
        }),
      finishRun: (checklistId, at = Date.now()) =>
        set(state => {
          const run = state.runs[checklistId];
          return {
            runs: run ? { ...state.runs, [checklistId]: { ...run, finishedAt: at } } : state.runs,
            checklists: state.checklists.map(checklist =>
              checklist.id === checklistId ? { ...checklist, lastCompletedAt: at } : checklist,
            ),
          };
        }),
    }),
    {
      name: CHECKLISTS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
