import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { BodySensationId, CueTrigger } from '../../../types/cue';
import { Colors } from '../../../utils/colors';
import { BODY_SENSATION_OPTIONS } from '../../../utils/cue-utils';

type BodyTrigger = Extract<CueTrigger, { type: 'body' }>;

interface BodyTriggerEditorProps {
  value: BodyTrigger;
  onChange: (trigger: BodyTrigger) => void;
}

export function BodyTriggerEditor({ value, onChange }: BodyTriggerEditorProps) {
  const toggleSensation = (sensation: BodySensationId) => {
    onChange({
      ...value,
      sensations: value.sensations.includes(sensation)
        ? value.sensations.filter(item => item !== sensation)
        : [...value.sensations, sensation],
    });
  };

  return (
    <View style={styles.chips}>
      {BODY_SENSATION_OPTIONS.map(option => {
        const selected = value.sensations.includes(option.id);
        return (
          <Pressable
            key={option.id}
            style={({ pressed }) => [styles.chip, selected && styles.selectedChip, pressed && styles.pressed]}
            onPress={() => toggleSensation(option.id)}
            accessibilityRole="checkbox"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
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
  selectedChip: { backgroundColor: `${Colors.cue.body}1f`, borderColor: Colors.cue.body },
  emoji: { fontSize: 17 },
  label: { color: Colors.text.muted, fontSize: 13, fontWeight: '600' },
  selectedLabel: { color: Colors.text.primary },
  pressed: { opacity: 0.72 },
});
