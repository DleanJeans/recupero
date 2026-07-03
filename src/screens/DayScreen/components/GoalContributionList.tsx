import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/BehaviorIcon';
import { Text } from '../../../components/Text';
import type { DailyMetadataContribution } from '../../../utils/behaviorUtils';
import { Colors } from '../../../utils/colors';
import { formatTime } from '../../../utils/timeUtils';

interface GoalContributionListProps {
  contributions: DailyMetadataContribution[];
}

export function GoalContributionList({ contributions }: GoalContributionListProps) {
  if (contributions.length === 0) {
    return <Text style={styles.empty}>No contributing logs.</Text>;
  }

  return (
    <View style={styles.list}>
      {contributions.map(contribution => (
        <View
          key={contribution.log.id}
          style={styles.row}
        >
          <Text style={styles.time}>{formatTime(contribution.log.timestamp)}</Text>
          <BehaviorIcon
            behavior={contribution.behavior}
            size={16}
          />
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {contribution.behavior.name}
          </Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{contribution.value}</Text>
            {contribution.unit ? <Text style={styles.unit}>{contribution.unit}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 28,
  },
  time: {
    width: 62,
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  name: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: 13,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  value: {
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
  },
  empty: {
    color: Colors.text.faint,
    fontSize: 12,
    paddingHorizontal: 4,
  },
});
