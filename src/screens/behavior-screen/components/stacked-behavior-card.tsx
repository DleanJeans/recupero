import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { Colors } from '../../../utils/colors';
import { getBehaviorMetadataFields, type StackedLog } from '../../../utils/metadata-calculation-utils';
import {
  getBehaviorFormFields,
  getFormCalculatedValues,
  getStackedTypedFormulaKeys,
} from '../../../utils/metadata-form-utils';
import { resolveFormulaState } from '../../../utils/metadata-formula-utils';
import { BehaviorMetadataFields } from './behavior-metadata-fields';

interface StackedBehaviorCardProps {
  stacked: StackedLog;
  onChange: (behaviorId: string, update: React.SetStateAction<Record<string, string>>) => void;
  onFormulaTypedChange: (behaviorId: string, key: string, typed: boolean) => void;
  onRemove: (behaviorId: string) => void;
  onFocus: () => void;
}

/** One stacked behaviour: its name and the same metadata inputs the main log form shows (BehaviorMetadataFields). */
export function StackedBehaviorCard({
  stacked,
  onChange,
  onFormulaTypedChange,
  onRemove,
  onFocus,
}: StackedBehaviorCardProps) {
  const behavior = useBehaviorStore(state => state.behaviors.find(b => b.id === stacked.behaviorId));
  const categories = useBehaviorStore(state => state.categories);
  const categoryFields = useMemo(
    () => (behavior ? getBehaviorMetadataFields(behavior, categories) : []),
    [behavior, categories],
  );
  const { fields, amountField, amountOptedOut } = useMemo(
    () =>
      behavior
        ? getBehaviorFormFields(behavior, categoryFields)
        : { fields: [], amountField: undefined, amountOptedOut: false },
    [behavior, categoryFields],
  );
  const typedFormulaKeys = useMemo(
    () => (behavior ? getStackedTypedFormulaKeys(stacked, behavior, categoryFields) : []),
    [behavior, categoryFields, stacked],
  );
  const calculatedValues = useMemo(() => {
    const { effectiveValues } = resolveFormulaState({
      fields,
      amountField,
      amountOptedOut,
      values: stacked.metadataValues,
      typedKeys: typedFormulaKeys,
    });
    return getFormCalculatedValues({
      fields,
      amountField,
      values: effectiveValues,
      defaultMetadata: behavior?.defaultMetadata,
      rateBasis: behavior?.metadataRateBasis,
    });
  }, [
    amountField,
    amountOptedOut,
    behavior?.defaultMetadata,
    behavior?.metadataRateBasis,
    fields,
    stacked.metadataValues,
    typedFormulaKeys,
  ]);
  const setValues = useCallback(
    (update: React.SetStateAction<Record<string, string>>) => onChange(stacked.behaviorId, update),
    [onChange, stacked.behaviorId],
  );
  const setFormulaTyped = useCallback(
    (key: string, typed: boolean) => onFormulaTypedChange(stacked.behaviorId, key, typed),
    [onFormulaTypedChange, stacked.behaviorId],
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
      <BehaviorMetadataFields
        behavior={behavior}
        fields={fields}
        amountField={amountField}
        amountOptedOut={amountOptedOut}
        values={stacked.metadataValues}
        onChange={setValues}
        typedFormulaKeys={typedFormulaKeys}
        onFormulaTypedChange={setFormulaTyped}
        calculatedValues={calculatedValues}
        onFocus={onFocus}
        gap={8}
      />
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
});
