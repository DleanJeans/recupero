import type { TimerSession } from '../store/timer-store';

/** The need a running timer fills: its level at `at` (epoch ms) and how long from then until it is full. */
export interface OverlayNeed {
  emoji: string;
  label: string;
  level: number;
  fullInMs: number;
  at: number;
}

/** The behavior's level progress before this timer started: XP into the level, and the level's size. */
export interface OverlayLevel {
  inLevel: number;
  forLevel: number;
}

/** What the pill draws besides the name: the behavior's emoji icon and its level. */
export interface OverlayExtras {
  icon?: string;
  level?: OverlayLevel;
  /** The behavior tracks another app's usage or fills a need, so the pill shows by default. Otherwise it stays hidden until toggled. */
  tracksApp?: boolean;
}

export interface OverlayTimer extends OverlayExtras {
  name: string;
  start: number;
  /** The item being worked on (e.g. the Shopping task "Buy MacBook case"). The pill shows it instead of the name. */
  note?: string;
  need?: OverlayNeed;
}

/** Timers that are counting right now (started and not stopped or paused), named for the floating pill. */
export function getRunningOverlayTimers(
  sessions: Array<
    Pick<TimerSession, 'lockedBehaviorId' | 'startTimestamp' | 'stopTimestamp'> &
      Partial<Pick<TimerSession, 'initialNotes'>>
  >,
  getName: (behaviorId: string) => string | undefined,
  getNeed?: (behaviorName: string) => OverlayNeed | undefined,
  getExtras?: (behaviorId: string) => OverlayExtras | undefined,
): OverlayTimer[] {
  const timers: OverlayTimer[] = [];
  for (const session of sessions) {
    if (session.startTimestamp == null || session.stopTimestamp != null) continue;
    const name = getName(session.lockedBehaviorId);
    if (name) {
      const note = session.initialNotes?.trim();
      timers.push({
        name,
        start: session.startTimestamp,
        ...(note ? { note } : {}),
        need: getNeed?.(name),
        ...getExtras?.(session.lockedBehaviorId),
      });
    }
  }
  return timers;
}
