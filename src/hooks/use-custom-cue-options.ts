import { useShallow } from 'zustand/react/shallow';
import { useCuesStore } from '../store/cues-store';
import type { CustomCueOptions } from '../types/cue';

/** Moods and body sensations the user added, for passing to the cue-utils option helpers. */
export function useCustomCueOptions(): CustomCueOptions {
  return useCuesStore(useShallow(state => ({ moods: state.customMoods, sensations: state.customSensations })));
}
