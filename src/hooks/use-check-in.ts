import { useMemo } from 'react';
import { useCuesStore } from '../store/cues-store';
import { useSettingsStore } from '../store/settings-store';
import {
  type CheckInEvent,
  type CheckInLevel,
  type CheckInStreak,
  getCheckInEvents,
  getCheckInLevel,
  getCheckInStreak,
  getCheckInXp,
} from '../utils/checkin-utils';
import { getCurrentMood } from '../utils/cue-utils';

export interface CheckInState {
  events: CheckInEvent[];
  xp: number;
  level: CheckInLevel;
  streak: CheckInStreak;
  /** Latest mood and body logs (any age). */
  lastMood?: { id: string; mood: string; ts: number };
  lastBody?: { id: string; sensation: string; ts: number };
}

/** Check-in XP, level and streak, derived from the mood and body logs. */
export function useCheckIn(): CheckInState {
  const moodLogs = useCuesStore(state => state.moodLogs);
  const bodyLogs = useCuesStore(state => state.bodyLogs);
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);
  return useMemo(() => {
    const events = getCheckInEvents(moodLogs, bodyLogs, dayCutoffHour);
    const xp = getCheckInXp(events);
    const lastBody = bodyLogs.reduce<(typeof bodyLogs)[number] | undefined>(
      (latest, log) => (!latest || log.ts > latest.ts ? log : latest),
      undefined,
    );
    return {
      events,
      xp,
      level: getCheckInLevel(xp),
      streak: getCheckInStreak(events, Date.now(), dayCutoffHour),
      lastMood: getCurrentMood(moodLogs),
      lastBody,
    };
  }, [moodLogs, bodyLogs, dayCutoffHour]);
}
