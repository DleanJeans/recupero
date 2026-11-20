import { useCuesStore } from '../store/cues-store';
import { useNeedsStore } from '../store/needs-store';
import type { BodySensationId } from '../types/cue';
import { getBodySensationOption } from './cue-utils';
import { getNeedIdForBodySensation } from './need-utils';

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
