import { type DependencyList, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

export function useDeferredComputation<T>(compute: () => T, deps: DependencyList): T | undefined {
  const [value, setValue] = useState<T>();

  useEffect(() => {
    let cancelled = false;
    setValue(undefined);

    const task = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) {
        setValue(compute());
      }
    });

    return () => {
      cancelled = true;
      task.cancel?.();
    };
  }, deps);

  return value;
}
