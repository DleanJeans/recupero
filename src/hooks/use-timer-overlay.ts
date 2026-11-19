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
  const startTimestamp = useTimerStore(s => s.startTimestamp);
  const stopTimestamp = useTimerStore(s => s.stopTimestamp);
  const parked = useTimerStore(s => s.parked);
  const behaviors = useBehaviorStore(s => s.behaviors);
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const { needs, now } = useNeedLevels();

  const timersJson = useMemo(() => {
    const sessions = [
      ...(lockedBehaviorId ? [{ lockedBehaviorId, initialNotes, startTimestamp, stopTimestamp }] : []),
      ...parked,
    ];
    const byId = new Map(behaviors.map(b => [b.id, b]));
    const names = new Map(behaviors.map(b => [b.id, b.name]));
    return JSON.stringify(
      getRunningOverlayTimers(
        sessions,
        id => names.get(id),
        name => {
          const need = needs.find(n => n.timerBehaviorNames?.includes(name) && n.timerFullInMs != null);
          const info = need ? NEED_INFO[need.id] : undefined;
          return need && info
            ? {
                emoji: info.emoji,
                label: info.label,
                level: need.level ?? 0,
                fullInMs: need.timerFullInMs ?? 0,
                at: now,
              }
            : undefined;
        },
        id => {
          const behavior = byId.get(id);
          if (!behavior) return undefined;
          // XP logged so far; the pill adds 1 XP per minute on the clock itself.
          const xp = behavior.xpEnabled ? getEffectiveXp(behavior, now, dayCutoffHour) : undefined;
          return {
            icon: iconText(behavior.icon) || undefined,
            level: xp == null ? undefined : { inLevel: getLevelXp(xp), forLevel: xpRequiredForLevel(getLevel(xp)) },
          };
        },
      ),
    );
  }, [lockedBehaviorId, initialNotes, startTimestamp, stopTimestamp, parked, behaviors, needs, now, dayCutoffHour]);

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
