import { useEffect, useMemo, useState } from 'react';
import { useBehaviorStore } from '../store/behavior-store';
import { useTimerStore } from '../store/timer-store';
import { getTaskTimeSpentMs } from '../utils/task-time-utils';

const TICK_MS = 30_000;

/** Total time spent per task id (see getTaskTimeSpentMs). Refreshes every 30 s while a task timer runs. */
export function useTaskTimeSpent(): Map<string, number> {
  const behaviors = useBehaviorStore(s => s.behaviors);
  const categories = useBehaviorStore(s => s.categories);
  const tasks = useBehaviorStore(s => s.tasks);
  const parked = useTimerStore(s => s.parked);
  const taskId = useTimerStore(s => s.taskId);
  const startTimestamp = useTimerStore(s => s.startTimestamp);
  const stopTimestamp = useTimerStore(s => s.stopTimestamp);
  const [now, setNow] = useState(() => Date.now());

  const running = useMemo(
    () => [{ taskId, startTimestamp, stopTimestamp }, ...parked],
    [taskId, startTimestamp, stopTimestamp, parked],
  );
  const anyRunning = running.some(timer => timer.taskId && timer.startTimestamp != null && timer.stopTimestamp == null);

  useEffect(() => {
    if (!anyRunning) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [anyRunning]);

  return useMemo(
    () => getTaskTimeSpentMs(behaviors, categories, tasks, running, now),
    [behaviors, categories, tasks, running, now],
  );
}
