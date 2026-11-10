import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { type DayMetadataRange, useScreenUiStore } from '../../../store/screen-ui-store';
import { Colors } from '../../../utils/colors';

const RANGES: { key: DayMetadataRange; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: '7 days' },
];

export function MetadataRangeSelector() {
  const range = useScreenUiStore(s => s.dayScreenMetadataRange);
  const setRange = useScreenUiStore(s => s.setDayScreenMetadataRange);

  return (
    <View style={styles.track}>
      {RANGES.map(item => {
        const selected = item.key === range;
        return (
          <Pressable
            key={item.key}
            style={[styles.segment, selected && styles.selectedSegment]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => setRange(item.key)}
          >
            <Text style={[styles.text, selected && styles.selectedText]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderRadius: 11,
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    borderRadius: 8,
  },
  selectedSegment: {
    backgroundColor: Colors.bg.elevated,
  },
  text: {
    color: Colors.text.faint,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedText: {
    color: Colors.text.primary,
  },
});
