import { type DependencyList, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

export function useAfterInteractionsFlag(deps: DependencyList): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    const task = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
      task.cancel?.();
    };
  }, deps);

  return ready;
}
