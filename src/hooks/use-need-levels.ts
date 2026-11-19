import { useEffect, useMemo, useState } from 'react';
import { useBehaviorStore } from '../store/behavior-store';
import { useNeedsStore } from '../store/needs-store';
import { useTimerStore } from '../store/timer-store';
import type { NeedConfig, NeedId, NeedMetadataSource } from '../types/need';
import {
  getBehaviorRefill,
  getDecayPerHour,
  getNeedEvents,
  getNeedMetadataSource,
  getTimerFullInMs,
  NEED_IDS,
  NEED_LOOKBACK_MS,
  type NeedState,
  simulateNeed,
  withTimerLog,
} from '../utils/need-utils';

const TICK_MS = 60_000;
/** Faster refresh while a timer runs, so the refilling need visibly climbs. */
const TIMER_TICK_MS = 5_000;

export interface NeedSnapshot extends NeedState {
  id: NeedId;
  config: NeedConfig;
  source?: NeedMetadataSource;
  /** Set while a running timer fills this need by duration: time left until it is full. */
  timerFullInMs?: number;
}

/** Current level of every enabled need, refreshed each minute. */
export function useNeedLevels(): { needs: NeedSnapshot[]; now: number } {
  const behaviors = useBehaviorStore(state => state.behaviors);
  const categories = useBehaviorStore(state => state.categories);
  const configs = useNeedsStore(state => state.needs);
  const checkIns = useNeedsStore(state => state.checkIns);
  const timerBehaviorId = useTimerStore(state => state.lockedBehaviorId);
  const timerStart = useTimerStore(state => state.startTimestamp);
  const timerStop = useTimerStore(state => state.stopTimestamp);
  const timerRunning = timerBehaviorId != null && timerStart != null && timerStop == null;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(value => value + 1), timerRunning ? TIMER_TICK_MS : TICK_MS);
    return () => clearInterval(interval);
  }, [timerRunning]);

  // `now` is read fresh whenever the data changes, so a check-in or log made a moment ago
  // (timestamped after the last tick) shows straight away instead of after the next tick.
  return useMemo(() => {
    const now = Date.now();
    const timerLog = timerBehaviorId != null && timerStart != null ? { timerBehaviorId, timerStart } : undefined;
    const needs = NEED_IDS.filter(id => configs[id].enabled).map(id => {
      const config = configs[id];
      const source = getNeedMetadataSource(id, config, categories);
      const events = getNeedEvents(
        id,
        config,
        withTimerLog(behaviors, timerLog, timerStop ?? now),
        checkIns,
        source,
        now - NEED_LOOKBACK_MS,
      );
      const state = simulateNeed(events, getDecayPerHour(config), now);
      const timerBehavior = timerLog && behaviors.find(behavior => behavior.id === timerLog.timerBehaviorId);
      const timerFullInMs =
        timerBehavior && timerStop == null
          ? getTimerFullInMs(state.level, getBehaviorRefill(config, timerBehavior, source))
          : undefined;
      return { id, config, source, timerFullInMs, ...state };
    });
    return { needs, now };
    // tick re-reads the clock each minute.
  }, [behaviors, categories, checkIns, configs, tick, timerBehaviorId, timerStart, timerStop]);
}
