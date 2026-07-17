import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CueTriggerIcon } from '../../../components/cues/cue-trigger-icon';
import { Text } from '../../../components/text';
import type { CueTriggerType } from '../../../types/cue';
import { Colors } from '../../../utils/colors';
import { CUE_TRIGGER_TYPES, getCueAccent } from '../../../utils/cue-utils';

const LABELS: Record<CueTriggerType, string> = {
  location: 'Location',
  time: 'Time',
  habit: 'Habit',
  mood: 'Mood',
};

interface TriggerTypeGridProps {
  value: CueTriggerType;
  onChange: (type: CueTriggerType) => void;
}

export function TriggerTypeGrid({ value, onChange }: TriggerTypeGridProps) {
  return (
    <View style={styles.grid}>
      {CUE_TRIGGER_TYPES.map(type => {
        const selected = value === type;
        const accent = getCueAccent(type);
        return (
          <Pressable
            key={type}
            style={({ pressed }) => [
              styles.card,
              selected && { borderColor: accent, backgroundColor: `${accent}12` },
              pressed && styles.pressed,
            ]}
            onPress={() => onChange(type)}
          >
            <CueTriggerIcon type={type} />
            <Text style={[styles.label, selected && styles.selectedLabel]}>{LABELS[type]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  card: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 12,
  },
  label: { color: Colors.text.muted, fontSize: 14, fontWeight: '700' },
  selectedLabel: { color: Colors.text.primary },
  pressed: { opacity: 0.72 },
});
