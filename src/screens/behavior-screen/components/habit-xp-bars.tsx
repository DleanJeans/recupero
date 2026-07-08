import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { XPBar } from '../../../components/xp-bar';
import { useSettingsStore } from '../../../store/settings-store';
import type { BehaviorEntry } from '../../../types/behavior';
import { getBehaviorTypeColor } from '../../../utils/behavior-type-utils';
import { getBehaviorXp, getHighestEffectiveXp } from '../../../utils/xp-utils';

interface HabitXPBarsProps {
  behavior: BehaviorEntry;
}

export function HabitXPBars({ behavior }: HabitXPBarsProps) {
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const [tick, setTick] = useState(0);
  const now = useMemo(() => Date.now(), [tick]);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const color = useMemo(() => getBehaviorTypeColor(behavior.type), [behavior.type]);
  const totalXp = useMemo(() => getBehaviorXp(behavior), [behavior]);
  const highestHabitXp = useMemo(
    () => getHighestEffectiveXp(behavior, now, dayCutoffHour),
    [behavior, dayCutoffHour, now, tick],
  );

  if (!behavior.xpEnabled || !behavior.xpDecay) return null;

  return (
    <View style={styles.container}>
      <XPBar
        xp={highestHabitXp}
        color={color}
        label="Highest Habit XP"
        motionEnabled={false}
      />
      {!behavior.hideTotalXp && (
        <XPBar
          xp={totalXp}
          color={color}
          label="Total XP"
          motionEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
});
