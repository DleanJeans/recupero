import { useEffect, useRef, useState } from 'react';

const TICK_MS = 100;

/**
 * Counts `durationMs` down and calls `onDone` at zero. While `paused` (finger on the toast, keyboard up) the
 * clock stands still. Returns the time left.
 */
export function useToastCountdown(durationMs: number, paused: boolean, onDone: () => void): number {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const remainingRef = useRef(durationMs);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (paused) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      remainingRef.current = Math.max(0, remainingRef.current - (now - last));
      last = now;
      setRemainingMs(remainingRef.current);
      if (remainingRef.current <= 0) {
        clearInterval(id);
        onDoneRef.current();
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [paused]);

  return remainingMs;
}
