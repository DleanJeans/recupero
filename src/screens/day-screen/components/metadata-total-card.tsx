import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { Text } from '../../../components/text';
import type { DailyMetadataContribution, DailyMetadataTotal } from '../../../utils/behavior-utils';
import { Colors } from '../../../utils/colors';
import { GoalContributionList } from './goal-contribution-list';

interface MetadataTotalCardProps {
  item: DailyMetadataTotal;
  expanded: boolean;
  contributions: DailyMetadataContribution[];
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

const CARD_LAYOUT = LinearTransition.duration(220);

export function MetadataTotalCard({ item, expanded, contributions, onPress, style }: MetadataTotalCardProps) {
  const currentValue = Math.max(item.value, 0);
  const goal = item.goal ?? 0;
  const progressTotal = Math.max(currentValue, goal);
  const goalPercent = progressTotal > 0 ? (Math.min(currentValue, goal) / progressTotal) * 100 : 0;
  const overflowPercent = currentValue > goal ? ((currentValue - goal) / progressTotal) * 100 : 0;
  const percentage = goal > 0 ? Math.round((currentValue / goal) * 100) : 0;

  return (
    <Animated.View
      collapsable={false}
      layout={CARD_LAYOUT}
      style={[styles.tile, expanded && styles.tileExpanded, style]}
    >
      <Pressable
        style={({ pressed }) => [styles.tileContent, pressed && styles.tilePressed]}
        accessible
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${item.label}: ${item.value} of ${item.goal} daily goal`}
        onPress={onPress}
      >
        <View style={styles.tileHeader}>
          <Text
            style={styles.label}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={17}
            color={Colors.text.faint}
          />
        </View>
        <Text
          selectable
          style={styles.bigValue}
        >
          {item.value}
          <Text style={styles.goalValue}>/{item.goal}</Text>
          {item.unit ? <Text style={styles.unit}> {item.unit}</Text> : null}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressSegment, { width: `${goalPercent}%` }]} />
          {overflowPercent > 0 && (
            <View style={[styles.progressSegment, styles.progressExceeded, { width: `${overflowPercent}%` }]} />
          )}
        </View>
        <Text style={styles.percentage}>{percentage}%</Text>
        {expanded && (
          <Animated.View
            entering={FadeInDown.duration(180)}
            exiting={FadeOutUp.duration(140)}
          >
            <GoalContributionList contributions={contributions} />
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tileContent: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 7,
  },
  tileExpanded: {
    borderColor: Colors.border.light,
  },
  tilePressed: {
    backgroundColor: Colors.bg.elevated,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    color: Colors.text.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  bigValue: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  goalValue: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
  },
  unit: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 3,
    backgroundColor: Colors.bg.input,
    overflow: 'hidden',
  },
  progressSegment: {
    height: '100%',
    backgroundColor: Colors.type.desirable,
  },
  progressExceeded: {
    backgroundColor: Colors.star.filled,
  },
  percentage: {
    color: Colors.type.desirable,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
