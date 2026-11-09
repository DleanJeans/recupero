import { useMemo } from 'react';
import { useBehaviorStore } from '../store/behavior-store';
import { useNeedsStore } from '../store/needs-store';
import type { NeedConfig, NeedId } from '../types/need';
import { getEmptyHoursAt, type NeedLevelPoint, replayNeedLevels } from '../utils/need-history-utils';
import {
  DEFAULT_NEED_CONFIGS,
  getNeedEvents,
  getNeedMetadataSource,
  NEED_LOOKBACK_MS,
  type NeedEvent,
} from '../utils/need-utils';

export interface NeedHistory {
  id: NeedId;
  config: NeedConfig;
  points: NeedLevelPoint[];
  /** Refills and check-ins inside the range. */
  events: NeedEvent[];
}

/** Replayed levels of the given needs between `from` and `to`, using the rate each had at the time. */
export function useNeedHistory(needIds: readonly NeedId[], from: number, to: number, stepMs: number): NeedHistory[] {
  const behaviors = useBehaviorStore(state => state.behaviors);
  const categories = useBehaviorStore(state => state.categories);
  const configs = useNeedsStore(state => state.needs);
  const checkIns = useNeedsStore(state => state.checkIns);
  const rateHistory = useNeedsStore(state => state.rateHistory);

  return useMemo(
    () =>
      needIds.map(id => {
        const config = configs[id];
        const source = getNeedMetadataSource(id, config, categories);
        const all = getNeedEvents(id, config, behaviors, checkIns, source, from - NEED_LOOKBACK_MS);
        const history = rateHistory[id] ?? [];
        const fallback = history.length ? DEFAULT_NEED_CONFIGS[id].emptyHours : config.emptyHours;
        const points = replayNeedLevels(all, ts => getEmptyHoursAt(history, fallback, ts), from, to, stepMs);
        return { id, config, points, events: all.filter(event => event.ts >= from && event.ts <= to) };
      }),
    [behaviors, categories, checkIns, configs, from, needIds, rateHistory, stepMs, to],
  );
}
