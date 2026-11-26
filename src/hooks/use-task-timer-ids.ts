import { useMemo } from 'react';
import { useBehaviorStore } from '../store/behavior-store';
import { isTimerSessionActive, useTimerStore } from '../store/timer-store';

/** Ids of the tasks that have a timer started (running or paused), on the Timer screen or parked. */
export function useTaskTimerIds(): ReadonlySet<string> {
  const taskId = useTimerStore(state => state.taskId);
  const startTimestamp = useTimerStore(state => state.startTimestamp);
  const pausedAt = useTimerStore(state => state.pausedAt);
  const parked = useTimerStore(state => state.parked);
  const tasks = useBehaviorStore(state => state.tasks);
  return useMemo(() => {
    const ids = new Set<string>();
    if (taskId && isTimerSessionActive({ startTimestamp, pausedAt })) ids.add(taskId);
    for (const session of parked) {
      if (session.taskId && isTimerSessionActive(session)) ids.add(session.taskId);
    }
    for (const task of tasks ?? []) {
      if (task.timerStartedAt != null) ids.add(task.id);
    }
    return ids;
  }, [taskId, startTimestamp, pausedAt, parked, tasks]);
}
