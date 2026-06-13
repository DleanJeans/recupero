import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { MetadataField } from '../types/behavior';
import { Colors } from '../utils/colors';
import { Button } from './Button';
import { EmojiPicker } from './EmojiPicker';
import { Text, TextInput } from './Text';

export interface CategoryFormProps {
  emoji: string;
  name: string;
  isEditing: boolean;
  onEmojiChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  /** Use darker background for nested contexts */
  dark?: boolean;
  /** Metadata fields for this category */
  metadataFields?: MetadataField[];
  /** Called when the metadata fields array changes */
  onMetadataFieldsChange?: (fields: MetadataField[]) => void;
}

export function CategoryForm({
  emoji,
  name,
  isEditing,
  onEmojiChange,
  onNameChange,
  onSave,
  onCancel,
  onDelete,
  dark,
  metadataFields = [],
  onMetadataFieldsChange,
}: CategoryFormProps) {
  const canSave = emoji.trim() && name.trim();

  const handleAddField = () => {
    const key = `field_${Date.now()}`;
    onMetadataFieldsChange?.([...metadataFields, { key, label: '', unit: '' }]);
  };

  const handleRemoveField = (index: number) => {
    onMetadataFieldsChange?.(metadataFields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, updates: Partial<MetadataField>) => {
    onMetadataFieldsChange?.(metadataFields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  return (
    <View style={[styles.form, dark && styles.formDark]}>
      <View style={styles.formRow}>
        <EmojiPicker
          value={emoji}
          onChangeText={onEmojiChange}
          nameHint={name}
        />
        <TextInput
          style={styles.nameInput}
          placeholder="Category name"
          placeholderTextColor={Colors.text.faint}
          value={name}
          onChangeText={onNameChange}
          onSubmitEditing={onSave}
          returnKeyType="done"
        />
      </View>

      {onMetadataFieldsChange && (
        <View style={styles.metadataFieldsSection}>
          <View style={styles.metadataHeader}>
            <Text style={styles.metadataLabel}>Track numeric values (optional)</Text>
            <Pressable
              onPress={handleAddField}
              style={styles.addFieldBtn}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={Colors.text.light}
              />
              <Text style={styles.addFieldText}>Add field</Text>
            </Pressable>
          </View>
          {metadataFields.map((field, index) => (
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
                  onChangeText={v => {
                    const key = v
                      .toLowerCase()
                      .replace(/\s+/g, '_')
                      .replace(/[^a-z0-9_]/g, '');
                    handleFieldChange(index, { label: v, key });
                  }}
                />
                <TextInput
                  style={[styles.fieldInput, styles.unitInput]}
                  placeholder="Unit"
                  placeholderTextColor={Colors.text.faint}
                  value={field.unit ?? ''}
                  onChangeText={v => handleFieldChange(index, { unit: v || undefined })}
                />
              </View>
              <Pressable
                onPress={() => handleRemoveField(index)}
                style={styles.removeFieldBtn}
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
      )}

      <View style={styles.formActions}>
        {isEditing && (
          <Button
            variant="danger"
            size="sm"
            onPress={onDelete}
            style={styles.formDeleteBtn}
          >
            Delete
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onPress={onCancel}
          style={styles.formCancelBtn}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onPress={onSave}
          disabled={!canSave}
          style={styles.formAddBtn}
        >
          {isEditing ? 'Save' : 'Add'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    gap: 10,
  },
  formDark: {
    backgroundColor: Colors.bg.darker,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  metadataFieldsSection: {
    gap: 6,
  },
  metadataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metadataLabel: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addFieldText: {
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
  removeFieldBtn: {
    padding: 2,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
  },
  formDeleteBtn: {
    backgroundColor: Colors.status.error,
    borderRadius: 6,
  },
  formCancelBtn: {
    flex: 1,
    borderRadius: 6,
  },
  formAddBtn: {
    flex: 1,
    borderRadius: 6,
  },
});
