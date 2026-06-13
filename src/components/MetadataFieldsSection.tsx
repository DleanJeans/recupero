import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { MetadataField } from '../types/behavior';
import { Colors } from '../utils/colors';
import { Text, TextInput } from './Text';

interface Props {
  fields: MetadataField[];
  onChange: (fields: MetadataField[]) => void;
}

function MetadataFieldsSection({ fields, onChange }: Props) {
  // Local copy so keystrokes don't trigger parent re-render → no focus loss
  const [localFields, setLocalFields] = useState<MetadataField[]>(fields);
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

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Track numeric values (optional)</Text>
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
      {localFields.map((field, index) => (
        <View
          key={field.key}
          style={styles.fieldRow}
        >
          <View style={styles.fieldInputs}>
            <TextInput
              style={styles.fieldInput}
              placeholder="Label"
              placeholderTextColor={Colors.text.faint}
              value={field.label}
              onChangeText={v => handleLabelChange(index, v)}
            />
            <TextInput
              style={[styles.fieldInput, styles.unitInput]}
              placeholder="Unit"
              placeholderTextColor={Colors.text.faint}
              value={field.unit ?? ''}
              onChangeText={v => handleUnitChange(index, v)}
            />
          </View>
          <Pressable
            onPress={() => handleRemoveField(index)}
            style={styles.removeBtn}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={Colors.text.faint}
            />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

export default React.memo(MetadataFieldsSection);

const styles = StyleSheet.create({
  section: {
    gap: 6,
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
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  fieldInput: {
    flex: 1,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  unitInput: {
    flex: 0.5,
  },
  removeBtn: {
    padding: 2,
  },
});
