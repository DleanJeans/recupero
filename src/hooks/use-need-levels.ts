import { useEffect, useMemo, useState } from 'react';
import { useBehaviorStore } from '../store/behavior-store';
import { useNeedsStore } from '../store/needs-store';
import type { NeedConfig, NeedId, NeedMetadataSource } from '../types/need';
import {
  getDecayPerHour,
  getNeedEvents,
  getNeedMetadataSource,
  NEED_IDS,
  NEED_LOOKBACK_MS,
  type NeedState,
  simulateNeed,
} from '../utils/need-utils';

const TICK_MS = 60_000;

export interface NeedSnapshot extends NeedState {
  id: NeedId;
  config: NeedConfig;
  source?: NeedMetadataSource;
}

/** Current level of every enabled need, refreshed each minute. */
export function useNeedLevels(): { needs: NeedSnapshot[]; now: number } {
  const behaviors = useBehaviorStore(state => state.behaviors);
  const categories = useBehaviorStore(state => state.categories);
  const configs = useNeedsStore(state => state.needs);
  const checkIns = useNeedsStore(state => state.checkIns);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(value => value + 1), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  // `now` is read fresh whenever the data changes, so a check-in or log made a moment ago
  // (timestamped after the last tick) shows straight away instead of after the next tick.
  return useMemo(() => {
    const now = Date.now();
    const needs = NEED_IDS.filter(id => configs[id].enabled).map(id => {
      const config = configs[id];
      const source = getNeedMetadataSource(id, config, categories);
      const events = getNeedEvents(id, config, behaviors, checkIns, source, now - NEED_LOOKBACK_MS);
      return { id, config, source, ...simulateNeed(events, getDecayPerHour(config), now) };
    });
    return { needs, now };
    // tick re-reads the clock each minute.
  }, [behaviors, categories, checkIns, configs, tick]);
}
