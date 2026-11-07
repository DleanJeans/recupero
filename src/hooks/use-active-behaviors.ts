import { useMemo } from 'react';
import { useBehaviorStore } from '../store/behavior-store';
import { getActiveBehaviors } from '../utils/archive-utils';

/** Every behaviour except archived ones. Use it for lists, pickers and suggestions. */
export function useActiveBehaviors() {
  const behaviors = useBehaviorStore(state => state.behaviors);
  return useMemo(() => getActiveBehaviors(behaviors), [behaviors]);
}
