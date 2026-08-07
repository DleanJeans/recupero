import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useSettingsStore } from '../../../store/settings-store';
import type { BehaviorType } from '../../../types/behavior';
import { getBehaviorTypeColor } from '../../../utils/behavior-type-utils';
import { Colors } from '../../../utils/colors';
import { getEffectiveXp, getLevel, getLevelProgress, getLevelXp, getXpToNextLevel } from '../../../utils/xp-utils';

const TYPE_LABELS: Record<BehaviorType, string> = {
  desirable: 'Desirable',
  neutral: 'Neutral',
  undesirable: 'Undesirable',
};

const TYPE_ORDER: BehaviorType[] = ['desirable', 'neutral', 'undesirable'];

interface Props {
  selectedCategoryId: string | null;
  motionEnabled?: boolean;
}
export function TypeXPBar({ selectedCategoryId, motionEnabled = true }: Props) {
  const behaviors = useBehaviorStore(s => s.behaviors);
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);

  const typeXp = useMemo(() => {
    const counts: Record<BehaviorType, number> = { desirable: 0, neutral: 0, undesirable: 0 };
    for (const behavior of behaviors) {
      if (selectedCategoryId !== null && behavior.categoryId !== selectedCategoryId) continue;
      if (!behavior.xpEnabled) continue;
      const effectiveXp = getEffectiveXp(behavior, Date.now(), dayCutoffHour);
      if (effectiveXp === 0) continue;
      counts[behavior.type ?? 'neutral'] += effectiveXp;
    }
    return counts;
  }, [behaviors, dayCutoffHour, selectedCategoryId]);

  const hasLogs = TYPE_ORDER.some(t => typeXp[t] > 0);
  if (!hasLogs) return null;

  return (
    <View style={styles.section}>
      {TYPE_ORDER.map(type => (
        <TypeXPCell
          key={type}
          type={type}
          xp={typeXp[type]}
          motionEnabled={motionEnabled}
        />
      ))}
    </View>
  );
}

interface TypeXPCellProps {
  type: BehaviorType;
  xp: number;
  motionEnabled: boolean;
}

function TypeXPCell({ type, xp, motionEnabled }: TypeXPCellProps) {
  const color = getBehaviorTypeColor(type);
  const level = getLevel(xp);
  const progress = Math.max(0, Math.min(1, getLevelProgress(xp)));
  const currentXp = getLevelXp(xp);
  const levelXp = currentXp + getXpToNextLevel(xp);
  const animatedProgress = useSharedValue(progress);
  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  useEffect(() => {
    animatedProgress.value = motionEnabled
      ? withSpring(progress, {
          damping: 18,
          stiffness: 120,
          mass: 0.8,
        })
      : progress;
  }, [animatedProgress, motionEnabled, progress]);

  return (
    <View style={styles.cell}>
      <Text style={[styles.label, { color }]}>{TYPE_LABELS[type]}</Text>
      <Text style={styles.level}>Lv{level}</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
      </View>
      <Text style={styles.value}>
        {currentXp}/{levelXp}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 6,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  level: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  track: {
    width: '100%',
    height: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  value: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
