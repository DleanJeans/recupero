import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useBehaviorStore } from '../store/behaviorStore';
import { getLevel, getEffectiveLogCount } from '../utils/xpUtils';

export function ConfettiOverlay() {
  const behaviors = useBehaviorStore(s => s.behaviors);
  const [confettiKey, setConfettiKey] = useState(0);
  const [visible, setVisible] = useState(false);
  const seeded = useRef(false);
  const lastLevels = useRef<Map<string, number>>(new Map());

  // Seed with behavior levels on first real render
  useEffect(() => {
    if (!seeded.current) {
      for (const b of behaviors) {
        lastLevels.current.set(b.id, getLevel(getEffectiveLogCount(b) * 5));
      }
      seeded.current = true;
    }
  }, [behaviors]);

  const trigger = useCallback(() => {
    setConfettiKey(k => k + 1);
    setVisible(true);
    setTimeout(() => setVisible(false), 5000);
  }, []);

  // Detect level-ups for desirable behaviors
  useEffect(() => {
    if (!seeded.current) return;

    for (const b of behaviors) {
      if (b.type !== 'desirable') continue;

      const level = getLevel(getEffectiveLogCount(b) * 5);
      const prevLevel = lastLevels.current.get(b.id) ?? 0;

      if (level > prevLevel) {
        lastLevels.current.set(b.id, level);
        trigger();
      }
    }
  }, [behaviors, trigger]);

  if (!visible) return null;

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
