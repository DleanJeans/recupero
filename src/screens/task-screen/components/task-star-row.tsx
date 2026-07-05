import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { TaskStarValue } from '../../../types/task';
import { Colors } from '../../../utils/colors';

export function TaskStarRow({ stars }: { stars: TaskStarValue }) {
  return (
    <View style={styles.taskStars}>
      {Array.from({ length: stars }).map((_, index) => (
        <Ionicons
          key={index}
          name="star"
          size={12}
          color={Colors.star.filled}
        />
      ))}
      <Text style={styles.taskStarsText}>{stars}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  taskStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  taskStarsText: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
