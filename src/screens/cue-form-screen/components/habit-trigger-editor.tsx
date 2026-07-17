import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CueBehaviorPicker } from '../../../components/cues/cue-behavior-picker';
import { Text, TextInput } from '../../../components/text';
import type { CueTrigger } from '../../../types/cue';
import { Colors } from '../../../utils/colors';

type HabitTrigger = Extract<CueTrigger, { type: 'habit' }>;

interface HabitTriggerEditorProps {
  value: HabitTrigger;
  onChange: (trigger: HabitTrigger) => void;
}

export function HabitTriggerEditor({ value, onChange }: HabitTriggerEditorProps) {
  return (
    <View style={styles.editor}>
      <Text style={styles.label}>After logging</Text>
      <CueBehaviorPicker
        selectedIds={value.behaviorId ? [value.behaviorId] : []}
        multiple={false}
        onChange={ids => onChange({ ...value, behaviorId: ids[0] ?? '' })}
      />
      <View style={styles.delayRow}>
        <View style={styles.delayCopy}>
          <Text style={styles.delayTitle}>Delay</Text>
          <Text style={styles.delayDetail}>Leave at 0 for immediately</Text>
        </View>
        <TextInput
          style={styles.delayInput}
          value={String(value.delayMin ?? 0)}
          onChangeText={text => onChange({ ...value, delayMin: Math.max(0, Number.parseInt(text, 10) || 0) })}
          keyboardType="number-pad"
          selectTextOnFocus
        />
        <Text style={styles.minutes}>min</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: 10 },
  label: { color: Colors.text.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  delayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  delayCopy: { flex: 1, gap: 2 },
  delayTitle: { color: Colors.text.primary, fontSize: 14, fontWeight: '600' },
  delayDetail: { color: Colors.text.faint, fontSize: 11 },
  delayInput: {
    width: 54,
    height: 38,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 0,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  minutes: { color: Colors.text.muted, fontSize: 12 },
});
