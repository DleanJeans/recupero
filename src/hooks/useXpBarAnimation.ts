import { useEffect, useRef, useState } from 'react';
import type { BehaviorEntry } from '../types/behavior';

/**
 * Drives the XpBar spring animation lifecycle for a single behavior.
 *
 * Detects when a new log was added to `behavior` while the screen is focused,
 * waits 800ms, then flips the `animate` flag so the consuming XpBar can spring.
 *
 * @param behavior The behavior to watch (null / undefined when not found).
 * @param isFocused Whether the containing screen is focused.
 * @returns `animate` — pass to `<XpBar animate={animate} />`.
 */
export function useXpBarAnimation(behavior: BehaviorEntry | undefined | null, isFocused: boolean): boolean {
  const [animate, setAnimate] = useState(false);
  const prevLogCount = useRef(behavior?.logs.length ?? 0);

  useEffect(() => {
    if (!behavior) return;

    if (isFocused && behavior.logs.length > prevLogCount.current) {
      prevLogCount.current = behavior.logs.length;
      const timer = setTimeout(() => setAnimate(true), 800);
      return () => clearTimeout(timer);
    }

    if (isFocused) {
      prevLogCount.current = behavior.logs.length;
    }
  }, [isFocused, behavior?.logs.length]);

  return animate;
}
