import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import type { MetadataField, MetadataFieldCalculation } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { TextInput } from '../../Text';
import { CalculationPill } from './CalculationPill';

const METADATA_FIELD_ROW_LAYOUT = LinearTransition.duration(220);

export const MetadataFieldColumnFlex = {
  label: 4,
  dailyGoal: 2,
  unit: 1,
} as const;

interface MetadataFieldRowProps {
  field: MetadataField;
  index: number;
  onLabelChange: (index: number, value: string) => void;
  onDailyGoalChange: (index: number, value: string) => void;
  onUnitChange: (index: number, value: string) => void;
  onCalculationChange: (index: number, calculation: MetadataFieldCalculation) => void;
  onRemove: (index: number) => void;
}

export function MetadataFieldRow({
  field,
  index,
  onLabelChange,
  onDailyGoalChange,
  onUnitChange,
  onCalculationChange,
  onRemove,
}: MetadataFieldRowProps) {
  return (
    <Animated.View
      layout={METADATA_FIELD_ROW_LAYOUT}
      style={styles.fieldRow}
    >
      <View style={styles.fieldInputs}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.fieldInput, styles.labelInput]}
            placeholder="Label"
            placeholderTextColor={Colors.text.faint}
            value={field.label}
            onChangeText={v => onLabelChange(index, v)}
          />
          <TextInput
            style={[styles.fieldInput, styles.dailyGoalInput]}
            placeholder="Daily goal"
            placeholderTextColor={Colors.text.faint}
            value={field.dailyGoal != null ? String(field.dailyGoal) : ''}
            onChangeText={v => onDailyGoalChange(index, v)}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <TextInput
            style={[styles.fieldInput, styles.unitInput]}
            placeholder="Unit"
            placeholderTextColor={Colors.text.faint}
            value={field.unit ?? ''}
            onChangeText={v => onUnitChange(index, v)}
          />
        </View>
        <View style={styles.controlsRow}>
          <View style={styles.calculationRow}>
            <CalculationPill
              label="Manual"
              active={!field.calculation || field.calculation === 'manual'}
              onPress={() => onCalculationChange(index, 'manual')}
            />
            <CalculationPill
              label="Amount"
              active={field.calculation === 'amount'}
              onPress={() => onCalculationChange(index, 'amount')}
            />
            <CalculationPill
              label="Per 100 Amount"
              active={field.calculation === 'per100'}
              onPress={() => onCalculationChange(index, 'per100')}
              flex={1.8}
            />
          </View>
        </View>
      </View>
      <Pressable
        onPress={() => onRemove(index)}
        style={styles.removeBtn}
      >
        <Ionicons
          name="close-circle"
          size={20}
          color={Colors.text.faint}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  fieldInputs: {
    flex: 1,
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 6,
  },
  fieldInput: {
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  labelInput: {
    flex: MetadataFieldColumnFlex.label,
  },
  dailyGoalInput: {
    flex: MetadataFieldColumnFlex.dailyGoal,
  },
  unitInput: {
    flex: MetadataFieldColumnFlex.unit,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  removeBtn: {
    padding: 3,
  },
  calculationRow: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
});
