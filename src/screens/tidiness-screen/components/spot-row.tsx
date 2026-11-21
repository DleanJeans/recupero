import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppIcon } from '../../../components/app-icon';
import { Text } from '../../../components/text';
import { useTidinessStore } from '../../../store/tidiness-store';
import { Colors } from '../../../utils/colors';
import { formatTidyAgo, formatTidyPercent, getTidyColor, type TidySpotState } from '../../../utils/tidiness-utils';
import { TidyBar } from './tidy-bar';

interface SpotRowProps {
  state: TidySpotState;
  now: number;
  onPress: () => void;
}

/** One spot inside a room card: name, bar, level, when it was last cleaned, and a ✓ to mark it clean. */
export function SpotRow({ state, now, onPress }: SpotRowProps) {
  const markClean = useTidinessStore(store => store.markClean);
  const { spot, level } = state;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${spot.name} ${formatTidyPercent(level)}`}
    >
      <AppIcon
        value={spot.emoji}
        size={16}
        fallback="🧹"
      />
      <Text
        style={styles.name}
        numberOfLines={1}
      >
        {spot.name}
      </Text>
      <TidyBar level={level} />
      <Text
        style={[styles.pct, { color: getTidyColor(level) }]}
        numberOfLines={1}
      >
        {formatTidyPercent(level)}
      </Text>
      <Text
        style={styles.ago}
        numberOfLines={1}
      >
        {formatTidyAgo(state.lastCleaned?.ts, now)}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.check, pressed && styles.checkPressed]}
        onPress={() => markClean(spot.id)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Mark ${spot.name} clean`}
      >
        <Ionicons
          name="checkmark"
          size={16}
          color={Colors.type.desirable}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.bg.input,
  },
  pressed: { backgroundColor: Colors.bg.darker },
  name: { width: 92, flexShrink: 1, color: Colors.text.secondary, fontSize: 14 },
  pct: { minWidth: 36, flexShrink: 0, textAlign: 'right', fontSize: 13, fontWeight: '600' },
  ago: { minWidth: 52, flexShrink: 0, textAlign: 'right', fontSize: 12, color: Colors.text.muted },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.type.desirable,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkPressed: { backgroundColor: Colors.typeBtn.desirable },
});
