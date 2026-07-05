import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { DailyMetadataTotal } from '../../../utils/behavior-utils';
import { Colors } from '../../../utils/colors';

interface MetadataTotalItemProps {
  item: DailyMetadataTotal;
  expanded?: boolean;
  onPress?: () => void;
}

export function MetadataTotalItem({ item, expanded, onPress }: MetadataTotalItemProps) {
  const hasGoal = item.goal != null && Number.isFinite(item.goal) && item.goal > 0;
  if (!hasGoal) {
    return (
      <View style={styles.metadataRow}>
        <Text style={styles.metadataLabel}>{item.label}</Text>
        <View style={styles.metadataValueRow}>
          <Text style={styles.metadataValue}>{item.value}</Text>
          {item.unit ? <Text style={styles.metadataUnit}>{item.unit}</Text> : null}
        </View>
      </View>
    );
  }

  const progressRatio = Math.min(item.value / item.goal!, 1);
  const percent = Math.round(progressRatio * 100);
  const content = (
    <>
      <View style={styles.metadataGoalHeader}>
        <Text
          style={styles.metadataGoalLabel}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        <View style={styles.metadataValueRow}>
          <Text style={styles.metadataGoalValue}>
            {item.value}/{item.goal}
          </Text>
          {item.unit ? <Text style={styles.metadataUnit}>{item.unit}</Text> : null}
        </View>
      </View>
      <View style={styles.metadataProgressTrack}>
        <View style={[styles.metadataProgressFill, { width: `${percent}%` }]} />
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={[styles.metadataGoalRow, expanded && styles.metadataGoalRowExpanded]}
        accessible
        accessibilityRole="button"
        accessibilityState={{ expanded: !!expanded }}
        accessibilityLabel={`${item.label}: ${item.value} of ${item.goal} daily goal`}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={styles.metadataGoalRow}
      accessible
      accessibilityLabel={`${item.label}: ${item.value} of ${item.goal} daily goal`}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  metadataGoalRow: {
    width: '100%',
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  metadataGoalRowExpanded: {
    borderColor: Colors.border.light,
  },
  metadataGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metadataGoalLabel: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  metadataGoalValue: {
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metadataValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metadataUnit: {
    color: Colors.text.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  metadataProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.bg.input,
    overflow: 'hidden',
  },
  metadataProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.type.desirable,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  metadataLabel: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  metadataValue: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
