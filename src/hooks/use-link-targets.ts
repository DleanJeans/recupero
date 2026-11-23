import { useMemo } from 'react';
import { useBehaviorStore } from '../store/behavior-store';
import { usePeopleStore } from '../store/people-store';
import type { LinkTargets } from '../utils/metadata-link-utils';

/** Tasks, behaviors and people that task/behavior/person metadata fields can point at. */
export function useLinkTargets(): LinkTargets {
  const tasks = useBehaviorStore(state => state.tasks);
  const behaviors = useBehaviorStore(state => state.behaviors);
  const people = usePeopleStore(state => state.people);
  return useMemo(() => ({ tasks, behaviors, people }), [tasks, behaviors, people]);
}
