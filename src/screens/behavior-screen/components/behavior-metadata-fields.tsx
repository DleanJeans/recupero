import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BehaviorEntry, MetadataField } from '../../../types/behavior';
import {
  type DailyGoalProgress,
  formatMetadataFieldLabel,
  getMetadataFieldCalculation,
} from '../../../utils/metadata-calculation-utils';
import { getVisibleMetadataFields } from '../../../utils/metadata-form-utils';
import { resolveFormulaState } from '../../../utils/metadata-formula-utils';
import { CalculatedMetadataFields } from './calculated-metadata-fields';
import { FormulaMetadataRow } from './formula-metadata-row';
import { MetadataInputRow } from './metadata-input-row';

interface Props {
  behavior: BehaviorEntry;
  /** The category's fields with "Unit from Base" resolved (see getBehaviorFormFields). */
  fields: MetadataField[];
  amountField: MetadataField | undefined;
  amountOptedOut: boolean;
  /** Typed values, keyed by field key. Formula results are worked out here, not stored in them. */
  values: Record<string, string>;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  /** Formula fields in Manual mode. */
  typedFormulaKeys: readonly string[];
  onFormulaTypedChange: (key: string, typed: boolean) => void;
  /** Per-amount values for the current amount (see getFormCalculatedValues). */
  calculatedValues: Record<string, number>;
  onFocus: () => void;
  onBlur?: () => void;
  progressByField?: Record<string, DailyGoalProgress | null>;
  /** Calculated fields are laid out in one or two columns. */
  calculatedColumns?: 1 | 2;
  gap?: number;
}

const noop = () => {};

/**
 * Every metadata input of one behaviour's log: Base amount, Manual numbers, formula rows, Task/Behavior/Person
 * links and the per-amount (Calculated) values. The main log form and each stacked behaviour's card both render
 * this, so a new field kind or layout change is made here once and can't leave one screen outdated.
 */
export function BehaviorMetadataFields({
  behavior,
  fields,
  amountField,
  amountOptedOut,
  values,
  onChange,
  typedFormulaKeys,
  onFormulaTypedChange,
  calculatedValues,
  onFocus,
  onBlur = noop,
  progressByField,
  calculatedColumns = 2,
  gap = 10,
}: Props) {
  const visibleFields = useMemo(() => getVisibleMetadataFields(fields, amountOptedOut), [amountOptedOut, fields]);
  const { formulaFields, inputKeys } = useMemo(
    () => resolveFormulaState({ fields, amountField, amountOptedOut, values, typedKeys: typedFormulaKeys }),
    [amountField, amountOptedOut, fields, typedFormulaKeys, values],
  );
  const calculatedCount = amountOptedOut ? 0 : fields.filter(f => getMetadataFieldCalculation(f) === 'per100').length;

  return (
    <View style={[styles.fields, { gap }]}>
      {visibleFields.map(field => {
        const calculation = getMetadataFieldCalculation(field);
        if (calculation === 'amount' && field.key !== amountField?.key) return null;
        // Fields a formula uses are typed inside that formula's row.
        if (inputKeys.has(field.key)) return null;
        if (formulaFields.some(formulaField => formulaField.key === field.key)) {
          return (
            <FormulaMetadataRow
              key={field.key}
              field={field}
              fields={fields}
              values={values}
              onChange={onChange}
              typed={typedFormulaKeys.includes(field.key)}
              onTypedChange={onFormulaTypedChange}
              onFocus={onFocus}
              onBlur={onBlur}
              progress={progressByField?.[field.key]}
              style={styles.fullWidth}
            />
          );
        }
        if (calculation === 'per100') {
          return (
            <CalculatedMetadataFields
              key={field.key}
              amountField={amountField}
              defaultMetadata={behavior.defaultMetadata}
              rateBasis={behavior.metadataRateBasis}
              fields={[field]}
              metadataValues={values}
              calculatedMetadataValues={calculatedValues}
              progressByField={progressByField}
              style={calculatedCount > 1 && calculatedColumns === 2 ? styles.halfWidth : styles.fullWidth}
            />
          );
        }
        return (
          <MetadataInputRow
            key={field.key}
            field={field}
            value={values[field.key] ?? ''}
            label={formatMetadataFieldLabel(field)}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            progress={progressByField?.[field.key]}
            behaviorId={behavior.id}
            style={styles.fullWidth}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  fullWidth: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    marginBottom: 0,
  },
  halfWidth: {
    width: '48%',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    marginBottom: 0,
  },
});
