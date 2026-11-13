import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { Colors } from '../../../utils/colors';
import {
  buildCalculatedMetadata,
  formatMetadataFieldLabel,
  getBehaviorAmountField,
  getBehaviorMetadataFields,
  getCalculatedMetadataFields,
  getManualMetadataFields,
  parseDecimalInput,
  type StackedLog,
} from '../../../utils/metadata-calculation-utils';
import { CalculatedMetadataFields } from './calculated-metadata-fields';
import { MetadataInputRow } from './metadata-input-row';

interface StackedBehaviorCardProps {
  stacked: StackedLog;
  onChange: (behaviorId: string, update: React.SetStateAction<Record<string, string>>) => void;
  onRemove: (behaviorId: string) => void;
  onFocus: () => void;
}

const noop = () => {};

export function StackedBehaviorCard({ stacked, onChange, onRemove, onFocus }: StackedBehaviorCardProps) {
  const behavior = useBehaviorStore(state => state.behaviors.find(b => b.id === stacked.behaviorId));
  const categories = useBehaviorStore(state => state.categories);
  const fields = useMemo(
    () => (behavior ? getBehaviorMetadataFields(behavior, categories) : []),
    [behavior, categories],
  );
  const amountField = useMemo(
    () => (behavior ? getBehaviorAmountField(behavior, fields) : undefined),
    [behavior, fields],
  );
  const inputFields = useMemo(
    () => (amountField ? [amountField, ...getManualMetadataFields(fields)] : getManualMetadataFields(fields)),
    [amountField, fields],
  );
  const calculatedFields = useMemo(
    () => (amountField ? getCalculatedMetadataFields(fields) : []),
    [amountField, fields],
  );
  const calculatedValues = useMemo(() => {
    const amountValue = amountField ? stacked.metadataValues[amountField.key] : undefined;
    if (!amountValue) return {};
    return buildCalculatedMetadata(
      fields,
      behavior?.defaultMetadata,
      parseDecimalInput(amountValue),
      behavior?.metadataRateBasis,
    );
  }, [amountField, behavior?.defaultMetadata, behavior?.metadataRateBasis, fields, stacked.metadataValues]);
  const setValues = useCallback(
    (update: React.SetStateAction<Record<string, string>>) => onChange(stacked.behaviorId, update),
    [onChange, stacked.behaviorId],
  );

  if (!behavior) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <BehaviorIcon
          behavior={behavior}
          size={22}
        />
        <Text
          style={styles.name}
          numberOfLines={1}
        >
          {behavior.name}
        </Text>
        <Button
          variant="icon"
          style={styles.removeButton}
          onPress={() => onRemove(behavior.id)}
          accessibilityLabel={`Remove ${behavior.name} from the stack`}
        >
          <Ionicons
            name="close"
            size={18}
            color={Colors.text.light}
          />
        </Button>
      </View>
      {inputFields.map(field => (
        <MetadataInputRow
          key={field.key}
          field={field}
          value={stacked.metadataValues[field.key] ?? ''}
          label={formatMetadataFieldLabel(field)}
          onChange={setValues}
          onFocus={onFocus}
          onBlur={noop}
          style={styles.input}
        />
      ))}
      {calculatedFields.length > 0 && (
        <View style={styles.calculatedGrid}>
          {calculatedFields.map(field => (
            <CalculatedMetadataFields
              key={field.key}
              amountField={amountField}
              defaultMetadata={behavior.defaultMetadata}
              rateBasis={behavior.metadataRateBasis}
              fields={[field]}
              metadataValues={stacked.metadataValues}
              calculatedMetadataValues={calculatedValues}
              style={styles.calculatedItem}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 10,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  removeButton: {
    width: 32,
    height: 32,
    padding: 0,
  },
  input: {
    marginBottom: 0,
  },
  calculatedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calculatedItem: {
    width: '48%',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
  },
});
