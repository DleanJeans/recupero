import { type DependencyList, useEffect, useState } from 'react';
import { scheduleIdleCallback } from '../utils/idle-callback-utils';

export function useAfterInteractionsFlag(deps: DependencyList): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    const cancelIdleCallback = scheduleIdleCallback(() => {
      if (!cancelled) {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
      cancelIdleCallback();
    };
  }, deps);

  return ready;
}
