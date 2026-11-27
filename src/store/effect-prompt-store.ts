import { create } from 'zustand';
import type { NeedId } from '../types/need';
import type { EffectCandidate } from '../utils/need-effect-utils';

/** A check-in came in well off what was expected right after a behaviour: ask if the behaviour did it. */
export interface EffectPrompt {
  needId: NeedId;
  /** When the check-in was made. */
  ts: number;
  /** The level the model expected, without any side effects. */
  expected: number;
  /** The level you checked in at. */
  actual: number;
  candidates: EffectCandidate[];
}

interface EffectPromptStore {
  prompt?: EffectPrompt;
  show: (prompt: EffectPrompt) => void;
  dismiss: () => void;
}

/** Not saved: a prompt only makes sense right after the check-in. */
export const useEffectPromptStore = create<EffectPromptStore>()(set => ({
  show: prompt => set({ prompt }),
  dismiss: () => set({ prompt: undefined }),
}));
