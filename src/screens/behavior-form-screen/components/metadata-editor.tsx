import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SelectPill } from '../../../components/select-pill';
import { Text } from '../../../components/text';
import type { Category, MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import {
  formatMetadataAmountBasis,
  formatMetadataFieldLabel,
  formatMetadataRateUnit,
  getAmountMetadataFields,
  getCalculatedMetadataFields,
  getManualMetadataFields,
  getOrderedMetadataFields,
  getSelectedAmountMetadataField,
} from '../../../utils/metadata-calculation-utils';
import { MetadataDefaultInput } from './metadata-default-input';

interface MetadataEditorProps {
  categoryId: string | undefined;
  categories: Category[];
  defaults: Record<string, string>;
  amountFieldKey: string | undefined;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onAmountFieldChange: (fieldKey: string) => void;
  metadataOrder?: string[];
  onMetadataOrderChange: (order: string[]) => void;
}

export function MetadataEditor({
  categoryId,
  categories,
  defaults,
  amountFieldKey,
  onChange,
  onAmountFieldChange,
  metadataOrder,
  onMetadataOrderChange,
}: MetadataEditorProps) {
  const selectedCategory = categories.find(category => category.id === categoryId);
  const fields = selectedCategory?.metadataFields ?? [];
  const orderedFields = useMemo(() => getOrderedMetadataFields(fields, metadataOrder), [fields, metadataOrder]);
  const amountFields = getAmountMetadataFields(orderedFields);
  const selectedAmountField = getSelectedAmountMetadataField(orderedFields, amountFieldKey);
  const manualFields = getManualMetadataFields(orderedFields);
  const calculatedFields = getCalculatedMetadataFields(orderedFields);
  const moveField = useCallback(
    (index: number, offset: number) => {
      const next = [...orderedFields];
      const targetIndex = index + offset;
      if (targetIndex < 0 || targetIndex >= next.length) return;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      onMetadataOrderChange(next.map(field => field.key));
    },
    [onMetadataOrderChange, orderedFields],
  );

  if (fields.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Metadata order</Text>
      <View style={styles.orderList}>
        {orderedFields.map((field, index) => (
          <View
            key={field.key}
            style={styles.orderRow}
          >
            <Text style={styles.orderLabel}>{formatMetadataFieldLabel(field)}</Text>
            <View style={styles.orderButtons}>
              <Pressable
                accessibilityLabel={`Move ${field.label} up`}
                disabled={index === 0}
                onPress={() => moveField(index, -1)}
                style={styles.orderButton}
              >
                <Ionicons
                  name="chevron-up"
                  size={16}
                  color={index === 0 ? Colors.text.faint : Colors.text.light}
                />
              </Pressable>
              <Pressable
                accessibilityLabel={`Move ${field.label} down`}
                disabled={index === orderedFields.length - 1}
                onPress={() => moveField(index, 1)}
                style={styles.orderButton}
              >
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={index === orderedFields.length - 1 ? Colors.text.faint : Colors.text.light}
                />
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      {amountFields.length > 0 && (
        <>
          <Text style={styles.label}>Amount unit</Text>
          <View style={styles.quantityUnitRow}>
            {amountFields.map(field => (
              <SelectPill
                key={field.key}
                label={formatMetadataFieldLabel(field)}
                active={selectedAmountField?.key === field.key}
                activeBtnStyle={styles.quantityUnitOptionActive}
                textStyle={styles.quantityUnitOptionText}
                activeTextStyle={styles.quantityUnitOptionTextActive}
                onPress={() => onAmountFieldChange(field.key)}
                style={styles.quantityUnitOption}
              />
            ))}
          </View>
        </>
      )}

      {manualFields.length > 0 && (
        <>
          <Text style={styles.label}>Default values</Text>
          {manualFields.map((field: MetadataField) => (
            <MetadataDefaultInput
              key={field.key}
              field={field}
              value={defaults[field.key] ?? ''}
              label={formatMetadataFieldLabel(field)}
              onChange={onChange}
            />
          ))}
        </>
      )}

      {calculatedFields.length > 0 && (
        <>
          <Text style={styles.label}>Rates per {formatMetadataAmountBasis(selectedAmountField)}</Text>
          {calculatedFields.map((field: MetadataField) => (
            <MetadataDefaultInput
              key={field.key}
              field={field}
              value={defaults[field.key] ?? ''}
              label={field.label}
              unitLabel={formatMetadataRateUnit({ field, amountField: selectedAmountField, separator: '\n' })}
              onChange={onChange}
            />
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
    marginTop: 12,
  },
  label: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  quantityUnitRow: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  quantityUnitOption: {
    flex: 1,
    paddingVertical: 9,
    backgroundColor: Colors.bg.card,
  },
  quantityUnitOptionActive: {
    backgroundColor: Colors.text.light,
  },
  quantityUnitOptionText: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  quantityUnitOptionTextActive: {
    color: Colors.bg.primary,
    fontWeight: '600',
  },
  orderList: {
    gap: 4,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    paddingVertical: 5,
    paddingLeft: 10,
  },
  orderLabel: {
    color: Colors.text.secondary,
    fontSize: 13,
    flex: 1,
  },
  orderButtons: {
    flexDirection: 'row',
  },
  orderButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
