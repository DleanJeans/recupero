import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import type { MetadataField, MetadataFieldCalculation } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { TextInput } from '../../text';
import { CalculationPill } from './calculation-pill';

const METADATA_FIELD_ROW_LAYOUT = LinearTransition.duration(220);

export const MetadataFieldColumnFlex = {
  label: 4,
  dailyGoal: 2,
  unit: 1,
} as const;

interface MetadataFieldRowProps {
  field: MetadataField;
  index: number;
  isLast: boolean;
  onLabelChange: (index: number, value: string) => void;
  onDailyGoalChange: (index: number, value: string) => void;
  onUnitChange: (index: number, value: string) => void;
  onCalculationChange: (index: number, calculation: MetadataFieldCalculation) => void;
  onMove: (index: number, offset: number) => void;
  onRemove: (index: number) => void;
}

export function MetadataFieldRow({
  field,
  index,
  isLast,
  onLabelChange,
  onDailyGoalChange,
  onUnitChange,
  onCalculationChange,
  onMove,
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
      <View style={styles.actions}>
        <View style={styles.reorderButtons}>
          <Pressable
            accessibilityLabel={`Move ${field.label || 'field'} up`}
            disabled={index === 0}
            onPress={() => onMove(index, -1)}
            style={styles.actionButton}
          >
            <Ionicons
              name="chevron-up"
              size={17}
              color={index === 0 ? Colors.text.faint : Colors.text.light}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={`Move ${field.label || 'field'} down`}
            disabled={isLast}
            onPress={() => onMove(index, 1)}
            style={styles.actionButton}
          >
            <Ionicons
              name="chevron-down"
              size={17}
              color={isLast ? Colors.text.faint : Colors.text.light}
            />
          </Pressable>
        </View>
        <Pressable
          accessibilityLabel={`Remove ${field.label || 'field'}`}
          onPress={() => onRemove(index)}
          style={styles.actionButton}
        >
          <Ionicons
            name="close-circle"
            size={20}
            color={Colors.text.faint}
          />
        </Pressable>
      </View>
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reorderButtons: {
    flexDirection: 'column',
  },
  actionButton: {
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
