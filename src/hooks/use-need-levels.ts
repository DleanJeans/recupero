import { useEffect, useMemo, useState } from 'react';
import { useBehaviorStore } from '../store/behavior-store';
import { useNeedsStore } from '../store/needs-store';
import { type TimerSession, useTimerStore } from '../store/timer-store';
import type { NeedConfig, NeedId, NeedMetadataSource } from '../types/need';
import {
  getBehaviorRefill,
  getDecayPerHour,
  getNeedEvents,
  getNeedMetadataSource,
  getSourceForBehavior,
  getTimerFullInMs,
  NEED_IDS,
  NEED_LOOKBACK_MS,
  type NeedState,
  type RunningTimerSpan,
  simulateNeed,
  withTimerLogs,
} from '../utils/need-utils';

function isRunning(session: TimerSession): boolean {
  return session.startTimestamp != null && session.stopTimestamp == null;
}

/** Every timer that has started: the open one and the parked ones. A stopped one counts up to its stop time. */
function getRunningTimers(
  behaviorId: string | undefined,
  start: number | undefined,
  stop: number | undefined,
  parked: TimerSession[],
  now: number,
): RunningTimerSpan[] {
  const timers: RunningTimerSpan[] = [];
  if (behaviorId != null && start != null) timers.push({ behaviorId, start, end: stop ?? now });
  for (const session of parked) {
    if (session.startTimestamp != null) {
      timers.push({
        behaviorId: session.lockedBehaviorId,
        start: session.startTimestamp,
        end: session.stopTimestamp ?? now,
      });
    }
  }
  return timers;
}

const TICK_MS = 60_000;
/** Faster refresh while a timer runs, so the refilling need visibly climbs. */
const TIMER_TICK_MS = 5_000;

export interface NeedSnapshot extends NeedState {
  id: NeedId;
  config: NeedConfig;
  source?: NeedMetadataSource;
  /** Set while a running timer fills this need by duration: time left until it is full. */
  timerFullInMs?: number;
  /** Names of the running timers that fill this need by duration. */
  timerBehaviorNames?: string[];
}

/** Current level of every enabled need, refreshed each minute. */
export function useNeedLevels(): { needs: NeedSnapshot[]; now: number } {
  const behaviors = useBehaviorStore(state => state.behaviors);
  const categories = useBehaviorStore(state => state.categories);
  const configs = useNeedsStore(state => state.needs);
  const needOrder = useNeedsStore(state => state.needOrder);
  const sortMode = useNeedsStore(state => state.needSortMode);
  const emojiOverrides = useNeedsStore(state => state.emojiOverrides);
  const checkIns = useNeedsStore(state => state.checkIns);
  const timerBehaviorId = useTimerStore(state => state.lockedBehaviorId);
  const timerStart = useTimerStore(state => state.startTimestamp);
  const timerStop = useTimerStore(state => state.stopTimestamp);
  const parkedTimers = useTimerStore(state => state.parked);
  const timerRunning =
    (timerBehaviorId != null && timerStart != null && timerStop == null) || parkedTimers.some(isRunning);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(value => value + 1), timerRunning ? TIMER_TICK_MS : TICK_MS);
    return () => clearInterval(interval);
  }, [timerRunning]);

  // `now` is read fresh whenever the data changes, so a check-in or log made a moment ago
  // (timestamped after the last tick) shows straight away instead of after the next tick.
  return useMemo(() => {
    const now = Date.now();
    const timers = getRunningTimers(timerBehaviorId, timerStart, timerStop, parkedTimers, now);
    const logged = withTimerLogs(behaviors, timers);
    const needs = NEED_IDS.filter(id => configs[id].enabled).map(id => {
      const config = configs[id];
      const source = getNeedMetadataSource(id, config, categories);
      const events = getNeedEvents(id, config, logged, checkIns, source, now - NEED_LOOKBACK_MS);
      const state = simulateNeed(events, getDecayPerHour(config), now);
      const filling = timers
        .filter(timer => timer.end >= now)
        .flatMap(timer => {
          const behavior = behaviors.find(candidate => candidate.id === timer.behaviorId);
          const refill = behavior
            ? getBehaviorRefill(config, behavior, getSourceForBehavior(source, behavior))
            : undefined;
          return behavior && refill?.mode === 'duration' ? [{ name: behavior.name, refill }] : [];
        });
      const timerFullInMs = getTimerFullInMs(
        state.level,
        filling.map(item => item.refill),
      );
      const timerBehaviorNames = timerFullInMs == null ? undefined : filling.map(item => item.name);
      return { id, config, source, timerFullInMs, timerBehaviorNames, ...state };
    });
    if (sortMode === 'level') needs.sort((a, b) => (a.level ?? Infinity) - (b.level ?? Infinity));
    return { needs, now };
    // tick re-reads the clock each minute.
  }, [
    behaviors,
    categories,
    checkIns,
    configs,
    needOrder,
    sortMode,
    emojiOverrides,
    tick,
    timerBehaviorId,
    timerStart,
    timerStop,
    parkedTimers,
  ]);
}
