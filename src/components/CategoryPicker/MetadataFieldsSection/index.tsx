import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { MetadataField, MetadataFieldCalculation } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { sanitizeDecimalInput, sortMetadataFieldsByCalculation } from '../../../utils/metadataCalculationUtils';
import { Text } from '../../Text';
import { MetadataFieldColumnFlex, MetadataFieldRow } from './MetadataFieldRow';

interface Props {
  fields: MetadataField[];
  onChange: (fields: MetadataField[]) => void;
}

function MetadataFieldsSection({ fields, onChange }: Props) {
  // Local copy so keystrokes don't trigger parent re-render → no focus loss
  const [localFields, setLocalFields] = useState<MetadataField[]>(() => sortMetadataFieldsByCalculation(fields));
  const latestRef = useRef(localFields);
  latestRef.current = localFields;
  // No useEffect to sync from parent — use key prop on parent side to remount on category change

  const handleAddField = useCallback(() => {
    const key = `field_${Date.now()}`;
    const next = [...latestRef.current, { key, label: '', unit: '' }];
    setLocalFields(next);
    onChange(next);
  }, [onChange]);

  const handleRemoveField = useCallback(
    (index: number) => {
      const next = latestRef.current.filter((_, i) => i !== index);
      setLocalFields(next);
      onChange(next);
    },
    [onChange],
  );

  const handleLabelChange = useCallback(
    (index: number, v: string) => {
      const next = latestRef.current.map((f, i) => (i === index ? { ...f, label: v } : f));
      latestRef.current = next;
      setLocalFields(next);
      onChange(next);
    },
    [onChange],
  );

  const handleUnitChange = useCallback(
    (index: number, v: string) => {
      const next = latestRef.current.map((f, i) => (i === index ? { ...f, unit: v || undefined } : f));
      latestRef.current = next;
      setLocalFields(next);
      onChange(next);
    },
    [onChange],
  );

  const handleDailyGoalChange = useCallback(
    (index: number, v: string) => {
      const sanitized = sanitizeDecimalInput(v);
      const parsed = Number(sanitized);
      const next = latestRef.current.map((field, i) =>
        i === index
          ? {
              ...field,
              dailyGoal: sanitized !== '' && Number.isFinite(parsed) ? parsed : undefined,
            }
          : field,
      );
      latestRef.current = next;
      setLocalFields(next);
      onChange(next);
    },
    [onChange],
  );

  const handleCalculationChange = useCallback(
    (index: number, calculation: MetadataFieldCalculation) => {
      const next = sortMetadataFieldsByCalculation(
        latestRef.current.map((field, i) => {
          if (i !== index) return field;
          return {
            ...field,
            calculation: calculation === 'manual' ? undefined : calculation,
          };
        }),
      );
      latestRef.current = next;
      setLocalFields(next);
      onChange(next);
    },
    [onChange],
  );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Track numeric values</Text>
        <Pressable
          onPress={handleAddField}
          style={styles.addBtn}
        >
          <Ionicons
            name="add-circle-outline"
            size={18}
            color={Colors.text.light}
          />
          <Text style={styles.addLabel}>Add field</Text>
        </Pressable>
      </View>

      {localFields.length > 0 && (
        <View style={styles.fieldsHeaderRow}>
          <View style={styles.fieldsHeaderLabels}>
            <Text style={[styles.fieldHeaderLabel, styles.nameHeaderLabel]}>Name</Text>
            <Text style={[styles.fieldHeaderLabel, styles.dailyGoalHeaderLabel]}>Daily Goal</Text>
            <Text style={[styles.fieldHeaderLabel, styles.unitHeaderLabel]}>Unit</Text>
          </View>
          <View style={styles.removeHeaderSpacer} />
        </View>
      )}

      {localFields.map((field, index) => (
        <MetadataFieldRow
          key={field.key}
          field={field}
          index={index}
          onLabelChange={handleLabelChange}
          onDailyGoalChange={handleDailyGoalChange}
          onUnitChange={handleUnitChange}
          onCalculationChange={handleCalculationChange}
          onRemove={handleRemoveField}
        />
      ))}
    </View>
  );
}

export default React.memo(MetadataFieldsSection);

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLabel: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addLabel: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
  },
  fieldsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -3,
  },
  fieldsHeaderLabels: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  fieldHeaderLabel: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
  },
  nameHeaderLabel: {
    flex: MetadataFieldColumnFlex.label,
    textAlign: 'center',
  },
  dailyGoalHeaderLabel: {
    flex: MetadataFieldColumnFlex.dailyGoal,
  },
  unitHeaderLabel: {
    flex: MetadataFieldColumnFlex.unit,
  },
  removeHeaderSpacer: {
    width: 26,
  },
});
