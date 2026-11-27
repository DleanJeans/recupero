import { useCuesStore } from '../store/cues-store';
import { useNeedsStore } from '../store/needs-store';
import type { BodySensationId, MoodId } from '../types/cue';
import { getBodySensationOption } from './cue-utils';
import { getNeedIdForBodySensation, NEED_IDS, NEED_INFO } from './need-utils';

/**
 * Feeling hungry, thirsty, tired or itchy (Hygiene) means that need is at least at its craving line.
 * Several sensations that point at the same need lower it once.
 */
export function applyBodySensationsToNeeds(sensations: readonly BodySensationId[]): void {
  const customSensations = useCuesStore.getState().customSensations;
  const { needs, lowerTo } = useNeedsStore.getState();
  const done = new Set<string>();
  for (const sensation of sensations) {
    const label = getBodySensationOption(sensation, customSensations).label;
    const needId = getNeedIdForBodySensation(sensation, label, needs);
    if (!needId || done.has(needId) || !needs[needId]?.enabled) continue;
    done.add(needId);
    lowerTo(needId, needs[needId].cravingLine, 'body');
  }
}

/** Moods that point at a need (Tired lowers Brain Energy) set it to at least its craving line, like body sensations. */
export function applyMoodsToNeeds(moods: readonly MoodId[]): void {
  const { needs, lowerTo } = useNeedsStore.getState();
  for (const needId of NEED_IDS) {
    if (!needs[needId]?.enabled) continue;
    if (!moods.some(mood => NEED_INFO[needId]?.moods?.includes(mood))) continue;
    lowerTo(needId, needs[needId].cravingLine, 'body');
  }
}
