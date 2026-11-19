import type { TimerSession } from '../store/timer-store';

/** The need a running timer fills: its level at `at` (epoch ms) and how long from then until it is full. */
export interface OverlayNeed {
  emoji: string;
  label: string;
  level: number;
  fullInMs: number;
  at: number;
}

export interface OverlayTimer {
  name: string;
  start: number;
  need?: OverlayNeed;
}

/** Timers that are counting right now (started and not stopped or paused), named for the floating pill. */
export function getRunningOverlayTimers(
  sessions: Array<Pick<TimerSession, 'lockedBehaviorId' | 'startTimestamp' | 'stopTimestamp'>>,
  getName: (behaviorId: string) => string | undefined,
  getNeed?: (behaviorName: string) => OverlayNeed | undefined,
): OverlayTimer[] {
  const timers: OverlayTimer[] = [];
  for (const session of sessions) {
    if (session.startTimestamp == null || session.stopTimestamp != null) continue;
    const name = getName(session.lockedBehaviorId);
    if (name) timers.push({ name, start: session.startTimestamp, need: getNeed?.(name) });
  }
  return timers;
}
