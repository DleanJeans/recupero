import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { CueTrigger, MoodId } from '../../../types/cue';
import { Colors } from '../../../utils/colors';
import { MOOD_OPTIONS } from '../../../utils/cue-utils';

type MoodTrigger = Extract<CueTrigger, { type: 'mood' }>;

interface MoodTriggerEditorProps {
  value: MoodTrigger;
  onChange: (trigger: MoodTrigger) => void;
}

export function MoodTriggerEditor({ value, onChange }: MoodTriggerEditorProps) {
  const toggleMood = (mood: MoodId) => {
    onChange({
      ...value,
      moods: value.moods.includes(mood) ? value.moods.filter(item => item !== mood) : [...value.moods, mood],
    });
  };

  return (
    <View style={styles.chips}>
      {MOOD_OPTIONS.map(option => {
        const selected = value.moods.includes(option.id);
        return (
          <Pressable
            key={option.id}
            style={({ pressed }) => [styles.chip, selected && styles.selectedChip, pressed && styles.pressed]}
            onPress={() => toggleMood(option.id)}
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg.input,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.bg.input,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  selectedChip: { backgroundColor: `${Colors.cue.mood}1f`, borderColor: Colors.cue.mood },
  emoji: { fontSize: 17 },
  label: { color: Colors.text.muted, fontSize: 13, fontWeight: '600' },
  selectedLabel: { color: Colors.text.primary },
  pressed: { opacity: 0.72 },
});
