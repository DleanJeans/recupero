import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { MetadataField } from '../../types/behavior';
import { Colors } from '../../utils/colors';
import { EmojiPicker } from '../EmojiPicker';
import { TextInput } from '../Text';
import MetadataFieldsSection from './MetadataFieldsSection';

export interface CategoryFormProps {
  emoji: string;
  name: string;
  isEditing: boolean;
  onEmojiChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onSave: () => void;
  /** Metadata fields for this category */
  metadataFields?: MetadataField[];
  /** Forces the metadata field editor to reset its local draft state. */
  metadataResetNonce?: number;
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
  metadataFields = [],
  metadataResetNonce = 0,
  onMetadataFieldsChange,
}: CategoryFormProps) {
  const metadataFieldsKey = `${metadataResetNonce}:${metadataFields
    .map(field => field.key)
    .sort()
    .join(',')}`;

  return (
    <View style={styles.form}>
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
        <MetadataFieldsSection
          key={metadataFieldsKey}
          fields={metadataFields}
          onChange={onMetadataFieldsChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
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
});
