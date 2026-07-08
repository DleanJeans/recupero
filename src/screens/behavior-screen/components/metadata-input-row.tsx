import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DailyGoalProgressBar } from '../../../components/daily-goal-progress-bar';
import { Text, TextInput } from '../../../components/text';
import type { MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import type { DailyGoalProgress } from '../../../utils/metadata-calculation-utils';
import { sanitizeDecimalInput } from '../../../utils/metadata-calculation-utils';

interface MetadataInputRowProps {
  field: MetadataField;
  value: string;
  label: string;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onFocus: () => void;
  onBlur: () => void;
  /** When set and the field has a `dailyGoal`, render a small progress bar
   *  under the input showing today's progress and the after-log delta. */
  progress?: DailyGoalProgress | null;
}

export function MetadataInputRow({ field, value, label, onChange, onFocus, onBlur, progress }: MetadataInputRowProps) {
  return (
    <View
      key={field.key}
      style={styles.metadataFieldRow}
    >
      <Text style={styles.metadataFieldLabel}>{label}</Text>
      <TextInput
        style={styles.metadataInput}
        value={value}
        onChangeText={v => onChange(prev => ({ ...prev, [field.key]: sanitizeDecimalInput(v) }))}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="0"
        placeholderTextColor={Colors.text.dim}
        keyboardType="decimal-pad"
        returnKeyType="done"
        maxLength={8}
      />
      {progress && <ProgressIndicator progress={progress} />}
    </View>
  );
}

function ProgressIndicator({ progress }: { progress: DailyGoalProgress }) {
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressBar}>
        <DailyGoalProgressBar
          current={progress.current}
          after={progress.after}
          goal={progress.goal}
        />
      </View>
      <Text style={styles.progressDelta}>+{progress.deltaPercent}%</Text>
    </View>
  );
}

export const metadataInputRowStyles = StyleSheet.create({
  metadataFieldRow: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  metadataFieldLabel: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  ...metadataInputRowStyles,
  metadataInput: {
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  progressBar: {
    flex: 1,
  },
  progressDelta: {
    color: Colors.type.desirable,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
