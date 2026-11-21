import { useEffect, useMemo, useState } from 'react';
import { useBehaviorStore } from '../store/behavior-store';
import { useTidinessStore } from '../store/tidiness-store';
import { getOverallTidiness, getSpotState, type TidyOverall, type TidySpotState } from '../utils/tidiness-utils';

const TICK_MS = 60_000;

/** Every spot's level and the overall Tidiness, refreshed each minute. */
export function useTidiness(): { states: TidySpotState[]; overall: TidyOverall; now: number } {
  const spots = useTidinessStore(state => state.spots);
  const marks = useTidinessStore(state => state.marks);
  const behaviors = useBehaviorStore(state => state.behaviors);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(value => value + 1), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: tick re-reads the clock each minute.
  return useMemo(() => {
    const now = Date.now();
    const states = spots.map(spot => getSpotState(spot, marks, behaviors, now));
    return { states, overall: getOverallTidiness(states), now };
  }, [spots, marks, behaviors, tick]);
}
