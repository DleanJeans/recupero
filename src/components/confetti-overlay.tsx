import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useBehaviorStore } from '../store/behavior-store';
import { useSettingsStore } from '../store/settings-store';
import { getEffectiveXp, getLevel } from '../utils/xp-utils';

export function ConfettiOverlay() {
  const behaviors = useBehaviorStore(s => s.behaviors);
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const [confettiKey, setConfettiKey] = useState(0);
  const [visible, setVisible] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const seeded = useRef(false);
  const lastLevels = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) setReduceMotionEnabled(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotionEnabled);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  // Seed with behavior levels on first real render
  useEffect(() => {
    if (!seeded.current) {
      for (const behavior of behaviors) {
        if (!behavior.xpEnabled) continue;
        lastLevels.current.set(behavior.id, getLevel(getEffectiveXp(behavior, Date.now(), dayCutoffHour)));
      }
      seeded.current = true;
    }
  }, [behaviors, dayCutoffHour]);

  const trigger = useCallback(() => {
    setConfettiKey(k => k + 1);
    setVisible(true);
    setTimeout(() => setVisible(false), 5000);
  }, []);

  // Detect level-ups for desirable behaviors
  useEffect(() => {
    if (!seeded.current) return;

    for (const behavior of behaviors) {
      if (behavior.type !== 'desirable') continue;
      if (!behavior.xpEnabled) continue;

      const level = getLevel(getEffectiveXp(behavior, Date.now(), dayCutoffHour));
      const prevLevel = lastLevels.current.get(behavior.id) ?? 0;

      if (level > prevLevel) {
        lastLevels.current.set(behavior.id, level);
        trigger();
      }
    }
  }, [behaviors, dayCutoffHour, trigger]);

  if (!visible || reduceMotionEnabled) return null;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <ConfettiCannon
        key={confettiKey}
        count={120}
        origin={{ x: 0, y: 0 }}
        explosionSpeed={350}
        fallSpeed={2000}
        fadeOut
        autoStart
      />
    </View>
  );
}
