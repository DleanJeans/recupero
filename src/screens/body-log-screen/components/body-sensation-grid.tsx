import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { BodySensationId } from '../../../types/cue';
import { Colors } from '../../../utils/colors';
import { BODY_SENSATION_OPTIONS } from '../../../utils/cue-utils';

interface BodySensationGridProps {
  selected?: BodySensationId;
  onSelect: (sensation: BodySensationId) => void;
}

export function BodySensationGrid({ selected, onSelect }: BodySensationGridProps) {
  return (
    <View style={styles.grid}>
      {BODY_SENSATION_OPTIONS.map(option => {
        const isSelected = option.id === selected;
        return (
          <Pressable
            key={option.id}
            style={({ pressed }) => [styles.tile, isSelected && styles.selectedTile, pressed && styles.pressed]}
            onPress={() => onSelect(option.id)}
            accessibilityRole="button"
            accessibilityLabel={`Log ${option.label}`}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={styles.emoji}>{option.emoji}</Text>
            <Text
              style={[styles.label, isSelected && styles.selectedLabel]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  tile: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 8,
    paddingVertical: 15,
  },
  selectedTile: { backgroundColor: `${Colors.cue.body}18`, borderColor: Colors.cue.body },
  emoji: { fontSize: 30 },
  label: { color: Colors.text.muted, fontSize: 13, fontWeight: '700' },
  selectedLabel: { color: Colors.text.primary },
  pressed: { opacity: 0.72 },
});
