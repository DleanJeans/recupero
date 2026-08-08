import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { MoodId } from '../../../types/cue';
import { Colors } from '../../../utils/colors';
import { MOOD_OPTIONS } from '../../../utils/cue-utils';

interface MoodGridProps {
  selectedMood?: MoodId;
  onSelect: (mood: MoodId) => void;
}

export function MoodGrid({ selectedMood, onSelect }: MoodGridProps) {
  return (
    <View style={styles.grid}>
      {MOOD_OPTIONS.map(option => {
        const selected = option.id === selectedMood;
        return (
          <Pressable
            key={option.id}
            style={({ pressed }) => [styles.tile, selected && styles.selectedTile, pressed && styles.pressed]}
            onPress={() => onSelect(option.id)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
          >
            <Text style={styles.emoji}>{option.emoji}</Text>
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
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
  selectedTile: { backgroundColor: `${Colors.cue.mood}18`, borderColor: Colors.cue.mood },
  emoji: { fontSize: 30 },
  label: { color: Colors.text.muted, fontSize: 13, fontWeight: '700' },
  selectedLabel: { color: Colors.text.primary },
  pressed: { opacity: 0.72 },
});
