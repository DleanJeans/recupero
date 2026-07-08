import { type DependencyList, useEffect, useState } from 'react';
import { scheduleIdleCallback } from '../utils/idle-callback-utils';

export function useDeferredComputation<T>(compute: () => T, deps: DependencyList): T | undefined {
  const [value, setValue] = useState<T>();

  useEffect(() => {
    let cancelled = false;
    setValue(undefined);

    const cancelIdleCallback = scheduleIdleCallback(() => {
      if (!cancelled) {
        setValue(compute());
      }
    });

    return () => {
      cancelled = true;
      cancelIdleCallback();
    };
  }, deps);

  return value;
}
