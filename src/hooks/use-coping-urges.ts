import { useEffect, useMemo, useState } from 'react';
import { useBehaviorStore } from '../store/behavior-store';
import { useCravingsStore } from '../store/cravings-store';
import type { BehaviorEntry } from '../types/behavior';
import type { CopingUrge } from '../types/urge';
import { getUrgeState, sortUrges, type UrgeState } from '../utils/urge-utils';

export interface CopingUrgeItem {
  urge: CopingUrge;
  behavior: BehaviorEntry;
  state: UrgeState;
}

const TICK_MS = 60_000;

/** Coping urges with their current level, highest (relative to the line) first. Archived behaviours are left out. */
export function useCopingUrges(): { items: CopingUrgeItem[]; now: number } {
  const behaviors = useBehaviorStore(state => state.behaviors);
  const urges = useCravingsStore(state => state.urges);
  const cravings = useCravingsStore(state => state.cravings);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const items = useMemo(() => {
    const byId = new Map(behaviors.map(behavior => [behavior.id, behavior]));
    const list: CopingUrgeItem[] = [];
    for (const urge of urges) {
      const behavior = byId.get(urge.behaviorId);
      if (!behavior || behavior.archivedAt != null) continue;
      const logTimestamps = behavior.logs.map(log => log.timestamp);
      list.push({ urge, behavior, state: getUrgeState(urge, logTimestamps, cravings, now) });
    }
    return sortUrges(list);
  }, [behaviors, urges, cravings, now]);

  return { items, now };
}
