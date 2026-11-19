import type { TimerSession } from '../store/timer-store';

export interface OverlayTimer {
  name: string;
  start: number;
}

/** Timers that are counting right now (started and not stopped or paused), named for the floating pill. */
export function getRunningOverlayTimers(
  sessions: Array<Pick<TimerSession, 'lockedBehaviorId' | 'startTimestamp' | 'stopTimestamp'>>,
  getName: (behaviorId: string) => string | undefined,
): OverlayTimer[] {
  const timers: OverlayTimer[] = [];
  for (const session of sessions) {
    if (session.startTimestamp == null || session.stopTimestamp != null) continue;
    const name = getName(session.lockedBehaviorId);
    if (name) timers.push({ name, start: session.startTimestamp });
  }
  return timers;
}
