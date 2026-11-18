import { useCallback, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { nextFabCollapsed } from '../utils/fab-collapse-utils';

/** Tracks scroll direction so an extending FAB can shrink to a circle while scrolling down. */
export function useFabCollapse() {
  const [collapsed, setCollapsed] = useState(false);
  const lastY = useRef(0);
  const collapsedRef = useRef(false);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = Math.max(0, e.nativeEvent.contentOffset.y);
    const next = nextFabCollapsed(collapsedRef.current, lastY.current, y);
    lastY.current = y;
    if (next !== collapsedRef.current) {
      collapsedRef.current = next;
      setCollapsed(next);
    }
  }, []);
  return { collapsed, onScroll };
}
