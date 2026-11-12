/** One notification shows the timer started from a suggestion; later states replace it in place. */
export const TIMER_NOTIFICATION_ID = 'timer-running';
export const TIMER_NOTIFICATION_KIND = 'timer';
export const TIMER_STOP_ACTION_ID = 'timer-stop';
export const TIMER_RUNNING_CATEGORY = 'timer-running';

export interface TimerNotificationData {
  kind: typeof TIMER_NOTIFICATION_KIND;
  state: 'running' | 'stopped' | 'busy';
  behaviorId?: string;
  [key: string]: unknown;
}

export interface TimerSnapshot {
  lockedBehaviorId: string | undefined;
  startTimestamp: number | undefined;
  stopTimestamp: number | undefined;
}

export type TimerStartDecision = 'start' | 'already-running' | 'busy';

export function isTimerRunning(timer: TimerSnapshot): boolean {
  return timer.startTimestamp != null && timer.stopTimestamp == null;
}

/**
 * Whether a "Start timer" tap may start `behaviorId`. A timer already running for another behaviour is kept
 * (the tap would otherwise throw its time away); a stopped one that was never logged is replaced.
 */
export function getTimerStartDecision(timer: TimerSnapshot, behaviorId: string): TimerStartDecision {
  if (!isTimerRunning(timer)) return 'start';
  return timer.lockedBehaviorId === behaviorId ? 'already-running' : 'busy';
}

function formatClock(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatElapsed(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function getTimerRunningContent(behaviorName: string, startedAt: number): { title: string; body: string } {
  return { title: `⏱ ${behaviorName}`, body: `Timer running since ${formatClock(startedAt)}. Tap to open it.` };
}

export function getTimerStoppedContent(
  behaviorName: string,
  startedAt: number,
  stoppedAt: number,
): { title: string; body: string } {
  return {
    title: `⏹ ${behaviorName}: ${formatElapsed(stoppedAt - startedAt)}`,
    body: 'Timer stopped. Tap to log it.',
  };
}

export function getTimerBusyContent(runningName: string, wantedName: string): { title: string; body: string } {
  return {
    title: `Already timing ${runningName}`,
    body: `Stop it first to start ${wantedName}. Tap to open the timer.`,
  };
}

export function isTimerNotificationData(data: unknown): data is TimerNotificationData {
  return data != null && typeof data === 'object' && (data as { kind?: unknown }).kind === TIMER_NOTIFICATION_KIND;
}
