import { useEffect, useMemo } from 'react';
import { AppUsage } from '../../modules/app-usage';
import { useBehaviorStore } from '../store/behavior-store';
import { getNeedAppOverlayWatches } from '../utils/need-app-overlay-utils';
import { useNeedLevels } from './use-need-levels';

/**
 * Tells the native app watcher which apps help a need, so opening one of them shows the timer overlay
 * by itself (even with Recupero closed). Needs Usage Access to log the time and "Display over other apps"
 * to draw; without them, or on an older build, nothing happens.
 */
export function useNeedAppOverlayWatches(enabled: boolean) {
  const behaviors = useBehaviorStore(s => s.behaviors);
  const { needs, now } = useNeedLevels();
  const json = useMemo(() => JSON.stringify(getNeedAppOverlayWatches(needs, behaviors, now)), [needs, behaviors, now]);

  useEffect(() => {
    if (!enabled || !AppUsage?.setNeedAppOverlayWatches) return;
    try {
      AppUsage.setNeedAppOverlayWatches(json);
    } catch (error) {
      console.warn('Need app overlay sync failed', error);
    }
  }, [enabled, json]);
}
