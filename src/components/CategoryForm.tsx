import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';
import { Button } from './Button';
import { EmojiPicker } from './EmojiPicker';
import { TextInput } from './Text';

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
}: CategoryFormProps) {
  const canSave = emoji.trim() && name.trim();

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
