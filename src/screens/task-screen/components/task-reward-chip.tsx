import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

interface TaskRewardChipProps {
  stars: number;
  /** Done: drawn green, since the stars are already earned. */
  earned?: boolean;
}

/** "+3★" pill on the right of a task, so the reward is the first thing you see. */
export function TaskRewardChip({ stars, earned = false }: TaskRewardChipProps) {
  const color = earned ? Colors.typeText.desirable : Colors.star.filled;
  return (
    <View
      style={[styles.chip, earned && styles.earned]}
      accessibilityLabel={`${earned ? 'Earned' : 'Earns'} ${stars} ${stars === 1 ? 'star' : 'stars'}`}
    >
      <Text
        style={[styles.text, { color }]}
        numberOfLines={1}
      >
        +{stars}
      </Text>
      <Ionicons
        name="star"
        size={11}
        color={color}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
    minWidth: 40,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#2a2410',
  },
  earned: {
    backgroundColor: '#13281b',
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
