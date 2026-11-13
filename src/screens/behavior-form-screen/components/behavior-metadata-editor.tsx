import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SelectPill } from '../../../components/select-pill';
import { Text, TextInput } from '../../../components/text';
import type { Category, MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import {
  evaluateDecimalInput,
  formatMetadataFieldLabel,
  getAmountMetadataFields,
  getCalculatedMetadataFields,
  getManualMetadataFields,
  getSelectedAmountMetadataField,
  NO_AMOUNT_FIELD_KEY,
  parseDecimalInput,
  resolveMetadataRateBasis,
  sanitizeDecimalInput,
} from '../../../utils/metadata-calculation-utils';
import { MetadataDefaultInput } from './metadata-default-input';
import { NutritionUrlImport } from './nutrition-url-import';

interface BehaviorMetadataEditorProps {
  categoryId: string | undefined;
  categories: Category[];
  defaults: Record<string, string>;
  amountFieldKey: string | undefined;
  /** Text of the "Rates per" amount input; empty or invalid falls back to 100. */
  rateBasis: string;
  onRateBasisChange: (value: string) => void;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onAmountFieldChange: (fieldKey: string) => void;
}

export function BehaviorMetadataEditor({
  categoryId,
  categories,
  defaults,
  amountFieldKey,
  rateBasis,
  onRateBasisChange,
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
            <SelectPill
              label="None"
              active={!selectedAmountField}
              activeBtnStyle={styles.quantityUnitOptionActive}
              textStyle={styles.quantityUnitOptionText}
              activeTextStyle={styles.quantityUnitOptionTextActive}
              onPress={() => onAmountFieldChange(NO_AMOUNT_FIELD_KEY)}
              style={styles.quantityUnitOption}
            />
          </View>
          {selectedAmountField && (
            <MetadataDefaultInput
              field={selectedAmountField}
              value={defaults[selectedAmountField.key] ?? ''}
              label="Default amount"
              unitLabel={selectedAmountField.unit}
              onChange={onChange}
            />
          )}
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

      {calculatedFields.length > 0 && (amountFields.length === 0 || selectedAmountField) && (
        <>
          <Text style={styles.label}>Rates</Text>
          {selectedAmountField && (
            <View style={styles.rateBasisRow}>
              <Text style={styles.rateBasisLabel}>Per</Text>
              <TextInput
                style={styles.rateBasisInput}
                value={rateBasis}
                onChangeText={value => onRateBasisChange(sanitizeDecimalInput(value))}
                onBlur={() => {
                  const parsed = parseDecimalInput(evaluateDecimalInput(rateBasis));
                  onRateBasisChange(String(resolveMetadataRateBasis(parsed)));
                }}
                placeholder="100"
                placeholderTextColor={Colors.text.dim}
                keyboardType="decimal-pad"
                returnKeyType="done"
                selectTextOnFocus
                maxLength={8}
              />
              <Text style={styles.rateBasisUnit}>{selectedAmountField.unit ?? selectedAmountField.label}</Text>
            </View>
          )}
          <NutritionUrlImport
            fields={fields}
            amountField={selectedAmountField}
            rateBasis={resolveMetadataRateBasis(parseDecimalInput(rateBasis))}
            onChange={onChange}
          />
          {calculatedFields.map((field: MetadataField) => (
            <MetadataDefaultInput
              key={field.key}
              field={field}
              value={defaults[field.key] ?? ''}
              label={field.label}
              unitLabel={field.unit}
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
  rateBasisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rateBasisLabel: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  rateBasisInput: {
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text.primary,
    fontSize: 14,
    width: 80,
    textAlign: 'right',
  },
  rateBasisUnit: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
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
