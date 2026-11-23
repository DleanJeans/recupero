import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../../../store/behavior-store';
import type {
  MetadataField,
  MetadataFieldCalculation,
  MetadataFieldListDisplay,
  MetadataFieldType,
} from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { sanitizeDecimalInput } from '../../../utils/metadata-calculation-utils';
import { getFormulaFieldKeys } from '../../../utils/metadata-formula-utils';
import {
  getLatestLogWithMetadata,
  getMetadataBarColors,
  setMetadataFieldListDisplay,
} from '../../../utils/metadata-list-display-utils';
import { Text } from '../../text';
import { MetadataFieldRow } from './metadata-field-row';
import { MetadataLogPreview } from './metadata-log-preview';

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
  const [expandedKey, setExpandedKey] = useState<string | undefined>();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const categoryBehaviors = useMemo(
    () => (categoryId ? behaviors.filter(behavior => behavior.categoryId === categoryId) : []),
    [behaviors, categoryId],
  );
  const preview = useMemo(
    () => getLatestLogWithMetadata(categoryBehaviors, localFields),
    [categoryBehaviors, localFields],
  );
  const barColors = useMemo(() => getMetadataBarColors(localFields, Colors.metadataBar), [localFields]);

  const handleToggleExpanded = useCallback((key: string) => {
    setExpandedKey(current => (current === key ? undefined : key));
  }, []);
  // No useEffect to sync from parent — use key prop on parent side to remount on category change

  const handleAddField = useCallback(() => {
    const key = `field_${Date.now()}`;
    const next = [...latestRef.current, { key, label: '', unit: '' }];
    latestRef.current = next;
    setLocalFields(next);
    setExpandedKey(key);
    onChange(next);
  }, [onChange]);

  const handleRemoveField = useCallback(
    (index: number) => {
      const field = latestRef.current[index];
      if (!field) return;

      const removeField = () => {
        // A formula that used the deleted field can't work any more, so it is cleared.
        const next = latestRef.current
          .filter((_, i) => i !== index)
          .map(other =>
            getFormulaFieldKeys(other.formula).includes(field.key) ? { ...other, formula: undefined } : other,
          );
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
          // Calculated fields come from rates, so they can't have a formula; only Manual fields follow the Base unit.
          formula: calculation === 'per100' ? undefined : field.formula,
          unitFromBase: calculation === 'manual' ? field.unitFromBase : undefined,
        };
      });
      latestRef.current = next;
      setLocalFields(next);
      onChange(next);
    },
    [onChange],
  );

  const handleTypeChange = useCallback(
    (index: number, type: MetadataFieldType) => {
      const next = latestRef.current.map((field, i) => {
        if (i !== index) return field;
        // Links hold an id, not a number: no goal, unit or calculation, and Bar makes no sense for them.
        if (type !== 'number') {
          return {
            ...field,
            type,
            unit: undefined,
            dailyGoal: undefined,
            calculation: undefined,
            formula: undefined,
            unitFromBase: undefined,
            listDisplay: field.listDisplay === 'hidden' ? ('hidden' as const) : undefined,
          };
        }
        return { ...field, type: undefined };
      });
      latestRef.current = next;
      setLocalFields(next);
      onChange(next);
    },
    [onChange],
  );

  const handleFormulaChange = useCallback(
    (index: number, formula: string | undefined) => {
      const next = latestRef.current.map((field, i) => (i === index ? { ...field, formula } : field));
      latestRef.current = next;
      setLocalFields(next);
      onChange(next);
    },
    [onChange],
  );

  const handleUnitFromBaseChange = useCallback(
    (index: number, unitFromBase: boolean) => {
      const next = latestRef.current.map((field, i) =>
        i === index ? { ...field, unitFromBase: unitFromBase ? (true as const) : undefined } : field,
      );
      latestRef.current = next;
      setLocalFields(next);
      onChange(next);
    },
    [onChange],
  );

  const handleListDisplayChange = useCallback(
    (index: number, listDisplay: MetadataFieldListDisplay) => {
      const next = setMetadataFieldListDisplay(latestRef.current, index, listDisplay);
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
        <Text style={styles.headerLabel}>Track values</Text>
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

      {preview && (
        <MetadataLogPreview
          behavior={preview.behavior}
          log={preview.log}
          fields={localFields}
        />
      )}
      {preview && localFields.length > 0 && <View style={styles.previewDivider} />}

      {localFields.map((field, index) => (
        <MetadataFieldRow
          key={field.key}
          field={field}
          fields={localFields}
          index={index}
          isLast={index === localFields.length - 1}
          expanded={expandedKey === field.key}
          barColor={barColors[field.key]}
          onToggleExpanded={handleToggleExpanded}
          onLabelChange={handleLabelChange}
          onDailyGoalChange={handleDailyGoalChange}
          onUnitChange={handleUnitChange}
          onCalculationChange={handleCalculationChange}
          onListDisplayChange={handleListDisplayChange}
          onTypeChange={handleTypeChange}
          onFormulaChange={handleFormulaChange}
          onUnitFromBaseChange={handleUnitFromBaseChange}
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
  previewDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border.light,
    marginVertical: 6,
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
