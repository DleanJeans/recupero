import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import type { MetadataField, MetadataFieldCalculation, MetadataFieldListDisplay } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import {
  getMetadataFieldListDisplay,
  METADATA_CALCULATION_LABELS,
  METADATA_LIST_DISPLAY_LABELS,
} from '../../../utils/metadata-list-display-utils';
import { Text, TextInput } from '../../text';
import { CalculationPill } from './calculation-pill';

const METADATA_FIELD_ROW_LAYOUT = LinearTransition.duration(220);

const CALCULATION_OPTIONS: MetadataFieldCalculation[] = ['manual', 'amount', 'per100'];
const LIST_DISPLAY_OPTIONS: MetadataFieldListDisplay[] = ['big', 'bar', 'text', 'hidden'];

interface MetadataFieldRowProps {
  field: MetadataField;
  index: number;
  isLast: boolean;
  expanded: boolean;
  barColor?: string;
  onToggleExpanded: (key: string) => void;
  onLabelChange: (index: number, value: string) => void;
  onDailyGoalChange: (index: number, value: string) => void;
  onUnitChange: (index: number, value: string) => void;
  onCalculationChange: (index: number, calculation: MetadataFieldCalculation) => void;
  onListDisplayChange: (index: number, listDisplay: MetadataFieldListDisplay) => void;
  onMove: (index: number, offset: number) => void;
  onRemove: (index: number) => void;
  isSorting: boolean;
}

export function MetadataFieldRow({
  field,
  index,
  isLast,
  expanded,
  barColor,
  onToggleExpanded,
  onLabelChange,
  onDailyGoalChange,
  onUnitChange,
  onCalculationChange,
  onListDisplayChange,
  onMove,
  onRemove,
  isSorting,
}: MetadataFieldRowProps) {
  const calculation = field.calculation ?? 'manual';
  const listDisplay = getMetadataFieldListDisplay(field);
  const showEditor = expanded && !isSorting;

  return (
    <Animated.View
      layout={METADATA_FIELD_ROW_LAYOUT}
      style={[styles.fieldRow, showEditor && styles.fieldRowExpanded]}
    >
      <Pressable
        style={styles.summaryRow}
        onPress={() => onToggleExpanded(field.key)}
        disabled={isSorting}
        accessibilityRole="button"
        accessibilityLabel={`${showEditor ? 'Collapse' : 'Edit'} ${field.label || 'field'}`}
        accessibilityState={{ expanded: showEditor }}
      >
        <Text
          style={[styles.summaryLabel, !field.label && styles.summaryLabelEmpty]}
          numberOfLines={1}
        >
          {field.label || 'New field'}
          {field.unit ? <Text style={styles.summaryUnit}> {field.unit}</Text> : null}
        </Text>
        {!showEditor && (
          <View style={styles.tags}>
            {field.dailyGoal != null ? <Text style={styles.tag}>goal {field.dailyGoal}</Text> : null}
            <Text style={styles.tag}>{METADATA_CALCULATION_LABELS[calculation]}</Text>
            <Text
              style={[
                styles.tag,
                listDisplay === 'big' && styles.tagBig,
                listDisplay === 'bar' && barColor != null && [styles.tagBar, { backgroundColor: barColor }],
              ]}
            >
              {METADATA_LIST_DISPLAY_LABELS[listDisplay]}
            </Text>
          </View>
        )}
        {isSorting ? (
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
        ) : (
          <Ionicons
            name={showEditor ? 'chevron-up' : 'chevron-forward'}
            size={16}
            color={Colors.text.faint}
          />
        )}
      </Pressable>

      {showEditor && (
        <View style={styles.editor}>
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
          <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>Value</Text>
            <View style={styles.pillRow}>
              {CALCULATION_OPTIONS.map(option => (
                <CalculationPill
                  key={option}
                  label={METADATA_CALCULATION_LABELS[option]}
                  active={calculation === option}
                  onPress={() => onCalculationChange(index, option)}
                />
              ))}
            </View>
          </View>
          <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>In log list</Text>
            <View style={styles.pillRow}>
              {LIST_DISPLAY_OPTIONS.map(option => (
                <CalculationPill
                  key={option}
                  label={METADATA_LIST_DISPLAY_LABELS[option]}
                  active={listDisplay === option}
                  onPress={() => onListDisplayChange(index, option)}
                />
              ))}
            </View>
          </View>
          <Pressable
            onPress={() => onRemove(index)}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${field.label || 'field'}`}
          >
            <Text style={styles.deleteLabel}>Delete field</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fieldRow: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 14,
  },
  fieldRowExpanded: {
    borderColor: Colors.border.light,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  summaryLabel: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  summaryLabelEmpty: {
    color: Colors.text.faint,
  },
  summaryUnit: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '400',
  },
  tags: {
    flexDirection: 'row',
    gap: 5,
  },
  tag: {
    color: Colors.text.light,
    backgroundColor: Colors.bg.input,
    borderRadius: 6,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '600',
  },
  tagBig: {
    backgroundColor: Colors.text.lightest,
    color: Colors.bg.primary,
  },
  tagBar: {
    color: Colors.bg.primary,
  },
  editor: {
    gap: 10,
    paddingHorizontal: 11,
    paddingBottom: 11,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 9,
  },
  fieldInput: {
    height: 46,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 15,
    fontWeight: '600',
    minWidth: 0,
  },
  labelInput: {
    flex: 1,
  },
  dailyGoalInput: {
    width: 92,
    textAlign: 'center',
  },
  unitInput: {
    width: 56,
    textAlign: 'center',
  },
  optionGroup: {
    gap: 5,
  },
  optionLabel: {
    color: Colors.text.muted,
    fontSize: 11,
    fontWeight: '600',
    paddingLeft: 4,
  },
  pillRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.primary,
    borderRadius: 11,
    overflow: 'hidden',
    padding: 3,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.status.danger,
  },
  deleteButtonPressed: {
    opacity: 0.7,
  },
  deleteLabel: {
    color: Colors.type.undesirable,
    fontSize: 13,
    fontWeight: '700',
  },
  reorderButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 3,
  },
});
