import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../../../store/behavior-store';
import type { MetadataField, MetadataFieldCalculation } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { sanitizeDecimalInput } from '../../../utils/metadata-calculation-utils';
import { Text } from '../../text';
import { MetadataFieldRow } from './metadata-field-row';

interface Props {
  categoryId?: string;
  fields: MetadataField[];
  onChange: (fields: MetadataField[]) => void;
}

function CategoryMetadataEditor({ categoryId, fields, onChange }: Props) {
  // Local copy so keystrokes don't trigger parent re-render → no focus loss
  const [localFields, setLocalFields] = useState<MetadataField[]>(() => fields);
  const latestRef = useRef(localFields);
  latestRef.current = localFields;
  const [isSorting, setIsSorting] = useState(false);
  const behaviors = useBehaviorStore(state => state.behaviors);
  const categoryBehaviors = useMemo(
    () => (categoryId ? behaviors.filter(behavior => behavior.categoryId === categoryId) : []),
    [behaviors, categoryId],
  );
  // No useEffect to sync from parent — use key prop on parent side to remount on category change

  const handleAddField = useCallback(() => {
    const key = `field_${Date.now()}`;
    const next = [...latestRef.current, { key, label: '', unit: '' }];
    latestRef.current = next;
    setLocalFields(next);
    onChange(next);
  }, [onChange]);

  const handleRemoveField = useCallback(
    (index: number) => {
      const field = latestRef.current[index];
      if (!field) return;

      const removeField = () => {
        const next = latestRef.current.filter((_, i) => i !== index);
        latestRef.current = next;
        setLocalFields(next);
        onChange(next);
      };
      const hasSavedValues = categoryBehaviors.some(behavior =>
        behavior.logs.some(log => log.metadata?.[field.key] != null),
      );

      if (!hasSavedValues) {
        removeField();
        return;
      }

      Alert.alert(
        'Delete metadata with saved values?',
        'Existing logs contain values for this metadata. Removing the field will hide those values from your logs.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: removeField },
        ],
      );
    },
    [categoryBehaviors, onChange],
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
      const next = latestRef.current.map((field, i) => {
        if (i !== index) return field;
        return {
          ...field,
          calculation: calculation === 'manual' ? undefined : calculation,
        };
      });
      latestRef.current = next;
      setLocalFields(next);
      onChange(next);
    },
    [onChange],
  );

  const handleMoveField = useCallback(
    (index: number, offset: number) => {
      const targetIndex = index + offset;
      if (targetIndex < 0 || targetIndex >= latestRef.current.length) return;
      const next = [...latestRef.current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
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
        <View style={styles.headerActions}>
          {localFields.length > 0 && (
            <Pressable
              onPress={() => setIsSorting(value => !value)}
              style={styles.addBtn}
              accessibilityRole="button"
              accessibilityLabel={isSorting ? 'Done sorting fields' : 'Sort fields'}
            >
              <Ionicons
                name={isSorting ? 'checkmark-circle-outline' : 'reorder-three-outline'}
                size={19}
                color={isSorting ? Colors.type.desirable : Colors.text.light}
              />
              <Text style={[styles.addLabel, isSorting && styles.sortingLabel]}>{isSorting ? 'Done' : 'Sort'}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {localFields.map((field, index) => (
        <MetadataFieldRow
          key={field.key}
          field={field}
          index={index}
          isLast={index === localFields.length - 1}
          onLabelChange={handleLabelChange}
          onDailyGoalChange={handleDailyGoalChange}
          onUnitChange={handleUnitChange}
          onCalculationChange={handleCalculationChange}
          onMove={handleMoveField}
          onRemove={handleRemoveField}
          isSorting={isSorting}
        />
      ))}

      <Pressable
        onPress={handleAddField}
        style={[styles.addBtn, styles.addFieldBtn]}
        accessibilityRole="button"
        accessibilityLabel="Add metadata field"
      >
        <Ionicons
          name="add-outline"
          size={19}
          color={Colors.text.light}
        />
        <Text style={styles.addLabel}>Add field</Text>
      </Pressable>
    </View>
  );
}

export default React.memo(CategoryMetadataEditor);

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  addFieldBtn: {
    alignSelf: 'center',
  },
  addLabel: {
    color: Colors.text.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  sortingLabel: {
    color: Colors.type.desirable,
  },
});
