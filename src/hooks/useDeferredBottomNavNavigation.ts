import { useCallback, useEffect, useRef, useState } from 'react';

export function useDeferredBottomNavNavigation<RouteName extends string>() {
  const [pendingRouteName, setPendingRouteName] = useState<RouteName | null>(null);
  const pendingFrame = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingNavigation = useCallback(() => {
    if (pendingFrame.current != null) {
      cancelAnimationFrame(pendingFrame.current);
      pendingFrame.current = null;
    }
    if (pendingTimeout.current != null) {
      clearTimeout(pendingTimeout.current);
      pendingTimeout.current = null;
    }
  }, []);

  const deferNavigation = useCallback(
    (routeName: RouteName, navigate: () => void) => {
      cancelPendingNavigation();
      setPendingRouteName(routeName);

      pendingFrame.current = requestAnimationFrame(() => {
        pendingFrame.current = null;
        pendingTimeout.current = setTimeout(() => {
          pendingTimeout.current = null;
          navigate();
        }, 0);
      });
    },
    [cancelPendingNavigation],
  );

  const completeNavigation = useCallback((routeName: string | undefined) => {
    setPendingRouteName(current => (current != null && current === routeName ? null : current));
  }, []);

  useEffect(() => {
    return cancelPendingNavigation;
  }, [cancelPendingNavigation]);

  return {
    pendingRouteName,
    deferNavigation,
    completeNavigation,
  };
}
