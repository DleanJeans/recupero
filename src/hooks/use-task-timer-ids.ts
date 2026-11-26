import { useMemo } from 'react';
import { isTimerSessionActive, useTimerStore } from '../store/timer-store';

/** Ids of the tasks that have a timer started (running or paused), on the Timer screen or parked. */
export function useTaskTimerIds(): ReadonlySet<string> {
  const taskId = useTimerStore(state => state.taskId);
  const startTimestamp = useTimerStore(state => state.startTimestamp);
  const pausedAt = useTimerStore(state => state.pausedAt);
  const parked = useTimerStore(state => state.parked);
  return useMemo(() => {
    const ids = new Set<string>();
    if (taskId && isTimerSessionActive({ startTimestamp, pausedAt })) ids.add(taskId);
    for (const session of parked) {
      if (session.taskId && isTimerSessionActive(session)) ids.add(session.taskId);
    }
    return ids;
  }, [taskId, startTimestamp, pausedAt, parked]);
}
