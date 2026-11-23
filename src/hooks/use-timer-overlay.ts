import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { AppUsage } from '../../modules/app-usage';
import { useBehaviorStore } from '../store/behavior-store';
import { useSettingsStore } from '../store/settings-store';
import { useTimerStore } from '../store/timer-store';
import { iconText } from '../utils/icon-utils';
import { NEED_INFO } from '../utils/need-utils';
import { getRunningOverlayTimers } from '../utils/timer-overlay-utils';
import { getEffectiveXp, getLevel, getLevelXp, xpRequiredForLevel } from '../utils/xp-utils';
import { useNeedLevels } from './use-need-levels';

/**
 * Shows the running timers as a floating pill over other apps while Recupero is in the background.
 * Needs the "Display over other apps" permission; without it (or on an older build) nothing happens.
 */
export function useTimerOverlay(enabled: boolean) {
  const lockedBehaviorId = useTimerStore(s => s.lockedBehaviorId);
  const initialNotes = useTimerStore(s => s.initialNotes);
  const appPackage = useTimerStore(s => s.appPackage);
  const startTimestamp = useTimerStore(s => s.startTimestamp);
  const stopTimestamp = useTimerStore(s => s.stopTimestamp);
  const parked = useTimerStore(s => s.parked);
  const behaviors = useBehaviorStore(s => s.behaviors);
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const { needs, now } = useNeedLevels();

  const timersJson = useMemo(() => {
    const sessions = [
      ...(lockedBehaviorId ? [{ lockedBehaviorId, initialNotes, appPackage, startTimestamp, stopTimestamp }] : []),
      ...parked,
    ];
    const byId = new Map(behaviors.map(b => [b.id, b]));
    const names = new Map(behaviors.map(b => [b.id, b.name]));
    return JSON.stringify(
      getRunningOverlayTimers(
        sessions,
        id => names.get(id),
        () => undefined,
        id => {
          const behavior = byId.get(id);
          if (!behavior) return undefined;
          // Also shown by default when a Need is being filled from this app's time (e.g. Fun apps).
          const fillsNeed = needs.some(n => n.timerFullInMs != null && n.timerBehaviorNames?.includes(behavior.name));
          // XP logged so far; the pill adds 1 XP per minute on the clock itself.
          const xp = behavior.xpEnabled ? getEffectiveXp(behavior, now, dayCutoffHour) : undefined;
          return {
            icon: iconText(behavior.icon) || undefined,
            tracksApp: behavior.autoTrackApp || fillsNeed ? true : undefined,
            appPackage: behavior.autoTrackApp?.packageName,
            level: xp == null ? undefined : { inLevel: getLevelXp(xp), forLevel: xpRequiredForLevel(getLevel(xp)) },
          };
        },
        // Every need this behavior fills, so a behavior that fills several shows one row each.
        name =>
          needs.flatMap(need => {
            const info = NEED_INFO[need.id];
            return info && need.timerBehaviorNames?.includes(name) && need.timerFullInMs != null
              ? [
                  {
                    emoji: info.emoji,
                    label: info.label,
                    level: need.level ?? 0,
                    fullInMs: need.timerFullInMs,
                    at: now,
                  },
                ]
              : [];
          }),
      ),
    );
  }, [
    lockedBehaviorId,
    initialNotes,
    appPackage,
    startTimestamp,
    stopTimestamp,
    parked,
    behaviors,
    needs,
    now,
    dayCutoffHour,
  ]);

  useEffect(() => {
    if (!enabled || !AppUsage?.startTimerOverlay) return;
    const apply = (state: string) => {
      try {
        if (timersJson === '[]') {
          AppUsage?.stopTimerOverlay?.();
        } else if (AppUsage?.canDrawOverlays?.()) {
          AppUsage.startTimerOverlay?.(timersJson, state !== 'active');
        }
      } catch (error) {
        console.warn('Timer overlay failed', error);
      }
    };
    apply(AppState.currentState);
    const subscription = AppState.addEventListener('change', state => {
      if (timersJson === '[]') return;
      try {
        AppUsage?.setTimerOverlayVisible?.(state !== 'active');
        // The service may have been killed while we were away; starting it again also restores the pill.
        if (state !== 'active') AppUsage?.startTimerOverlay?.(timersJson, true);
      } catch (error) {
        console.warn('Timer overlay failed', error);
      }
    });
    return () => subscription.remove();
  }, [enabled, timersJson]);
}
