import type { BehaviorEntry } from '../types/behavior';

/** How many of the latest manual logs are checked to see if a behaviour is usually timed. */
const RECENT_LOG_SAMPLE = 10;

/** True when a behaviour is usually logged with a duration (reading, language practice),
 *  so its main button should start a timer instead of logging an instant entry.
 *  Duration XP behaviours always count; otherwise at least half of the latest manual logs need a duration. */
export function prefersTimer(behavior: Pick<BehaviorEntry, 'durationXpEnabled' | 'logs'>): boolean {
  if (behavior.durationXpEnabled) return true;
  const manual = behavior.logs
    .filter(log => log.source == null)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, RECENT_LOG_SAMPLE);
  if (manual.length === 0) return false;
  const timed = manual.filter(log => log.endTimestamp != null && log.endTimestamp > log.timestamp).length;
  return timed * 2 >= manual.length;
}
