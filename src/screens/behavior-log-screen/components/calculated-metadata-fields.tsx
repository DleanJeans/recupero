import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { formatMetadataFieldLabel, formatMetadataRateUnit } from '../../../utils/metadata-calculation-utils';
import { metadataInputRowStyles } from './metadata-input-row';

interface CalculatedMetadataFieldsProps {
  amountField?: MetadataField;
  defaultMetadata?: Record<string, number>;
  fields: MetadataField[];
  metadataValues: Record<string, string>;
  calculatedMetadataValues: Record<string, number>;
}

export function CalculatedMetadataFields({
  amountField,
  defaultMetadata,
  fields,
  metadataValues,
  calculatedMetadataValues,
}: CalculatedMetadataFieldsProps) {
  if (fields.length === 0) return null;

  return (
    <View style={styles.grid}>
      {fields.map(field => {
        const value = calculatedMetadataValues[field.key];
        const existingValue = metadataValues[field.key];
        const displayValue = value != null ? String(value) : (existingValue ?? '');

        return (
          <View
            key={field.key}
            style={[styles.metadataFieldRow, styles.metadataCalculatedRow]}
          >
            <Text style={styles.metadataFieldLabel}>{formatMetadataFieldLabel(field)}</Text>
            <View style={styles.metadataCalculatedValueRow}>
              <Text style={styles.metadataCalculatedValue}>{displayValue || '0'}</Text>
              <Text style={styles.metadataCalculatedRate}>
                {defaultMetadata?.[field.key] ?? 0}{' '}
                {formatMetadataRateUnit({ field, amountField, includeFieldUnit: false })}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  metadataFieldRow: {
    ...metadataInputRowStyles.metadataFieldRow,
    flexBasis: '48%',
    flexGrow: 1,
    marginBottom: 0,
  },
  metadataFieldLabel: {
    ...metadataInputRowStyles.metadataFieldLabel,
  },
  metadataCalculatedRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border.default,
  },
  metadataCalculatedValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  metadataCalculatedValue: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metadataCalculatedRate: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
});
