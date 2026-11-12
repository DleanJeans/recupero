import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { useBehaviorStore } from '../store/behavior-store';
import { useNeedsStore } from '../store/needs-store';
import type { RootStackParamList } from '../types/navigation';
import { dismissRefilledNeedNudges, syncNeedNudges } from '../utils/need-notifications';
import {
  getDecayPerHour,
  getNeedEvents,
  getNeedMetadataSource,
  getNeedNudgePlans,
  getRefillBehaviorIds,
  getRefilledNeedIds,
  isNeedNotificationData,
  NEED_IDS,
  NEED_LOOKBACK_MS,
  NEED_NOT_YET_ACTION,
  type NeedNudgeInput,
  type NeedNudgePlan,
  simulateNeed,
} from '../utils/need-utils';

const NAVIGATION_RETRY_MS = 250;
const NAVIGATION_MAX_RETRIES = 20;

function buildNudgeInputs(now: number): NeedNudgeInput[] {
  const { behaviors, categories } = useBehaviorStore.getState();
  const { needs, checkIns } = useNeedsStore.getState();
  const nameById = new Map(behaviors.map(behavior => [behavior.id, behavior.name]));
  return NEED_IDS.map(id => {
    const config = needs[id];
    const source = getNeedMetadataSource(id, config, categories);
    const events = getNeedEvents(id, config, behaviors, checkIns, source, now - NEED_LOOKBACK_MS);
    const state = simulateNeed(events, getDecayPerHour(config), now);
    const refills = getRefillBehaviorIds(config, behaviors, source, now, 2).map(behaviorId => ({
      id: behaviorId,
      name: nameById.get(behaviorId) ?? '',
    }));
    return { id, config, level: state.level, lastRefillAt: state.lastRefillAt, refills };
  });
}

/**
 * Schedules a push for each need at the time it will cross its nudge line, re-planned whenever
 * logs or needs change, dismisses shown pushes once their need is refilled above the nudge line,
 * and handles taps on those pushes ("Not yet" counts as a check-in).
 */
export function useNeedNudges(ready: boolean, navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>) {
  const lastSignature = useRef<string | null>(null);
  const handledResponseIds = useRef(new Set<string>());
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!ready) return;
    const sync = () => {
      const now = Date.now();
      const inputs = buildNudgeInputs(now);
      dismissRefilledNeedNudges(getRefilledNeedIds(inputs)).catch(error =>
        console.warn('Need nudge dismiss failed', error),
      );
      const plans = getNeedNudgePlans(inputs, now);
      const signature = JSON.stringify(plans);
      if (signature === lastSignature.current) return;
      lastSignature.current = signature;
      syncNeedNudges(plans).catch(error => console.warn('Need nudge sync failed', error));
    };
    sync();
    const unsubscribeBehaviors = useBehaviorStore.subscribe((state, previous) => {
      if (state.behaviors !== previous.behaviors || state.categories !== previous.categories) sync();
    });
    const unsubscribeNeeds = useNeedsStore.subscribe(sync);
    return () => {
      unsubscribeBehaviors();
      unsubscribeNeeds();
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !lastResponse) return;
    const { notification, actionIdentifier } = lastResponse;
    const data = notification.request.content.data;
    if (!isNeedNotificationData(data)) return;
    const responseId = `${notification.request.identifier}:${notification.date}:${actionIdentifier}`;
    if (handledResponseIds.current.has(responseId)) return;
    handledResponseIds.current.add(responseId);

    if (actionIdentifier === NEED_NOT_YET_ACTION) {
      const config = useNeedsStore.getState().needs[data.needId];
      if (config) useNeedsStore.getState().checkIn(data.needId, config.cravingLine, 'notification');
    }
    const behaviors = useBehaviorStore.getState().behaviors;
    const chosenId = actionIdentifier.startsWith('log:') ? actionIdentifier.slice(4) : undefined;
    const behaviorId = chosenId && behaviors.some(behavior => behavior.id === chosenId) ? chosenId : undefined;

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const open = () => {
      if (!navigationRef.isReady()) {
        if (attempts++ < NAVIGATION_MAX_RETRIES) timer = setTimeout(open, NAVIGATION_RETRY_MS);
        return;
      }
      if (behaviorId) navigationRef.navigate('BehaviorLog', { behaviorId, initialMode: 'log' });
      else navigationRef.navigate('Cues');
      Notifications.dismissNotificationAsync(notification.request.identifier).catch(() => undefined);
    };
    open();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [ready, lastResponse, navigationRef]);
}
