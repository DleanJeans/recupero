import React from 'react';
import { StyleSheet, View } from 'react-native';
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
  getSelectedAmountMetadataField,
} from '../../../utils/metadata-calculation-utils';
import { MetadataDefaultInput } from './metadata-default-input';

interface BehaviorMetadataEditorProps {
  categoryId: string | undefined;
  categories: Category[];
  defaults: Record<string, string>;
  amountFieldKey: string | undefined;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onAmountFieldChange: (fieldKey: string) => void;
}

export function BehaviorMetadataEditor({
  categoryId,
  categories,
  defaults,
  amountFieldKey,
  onChange,
  onAmountFieldChange,
}: BehaviorMetadataEditorProps) {
  const selectedCategory = categories.find(category => category.id === categoryId);
  const fields = selectedCategory?.metadataFields ?? [];
  const amountFields = getAmountMetadataFields(fields);
  const selectedAmountField = getSelectedAmountMetadataField(fields, amountFieldKey);
  const manualFields = getManualMetadataFields(fields);
  const calculatedFields = getCalculatedMetadataFields(fields);

  if (fields.length === 0) return null;

  return (
    <View style={styles.section}>
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
});
