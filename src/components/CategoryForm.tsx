import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { EmojiPicker } from './EmojiPicker';
import { TextInput } from './Text';

interface Props {
  emoji: string;
  name: string;
  isEditing: boolean;
  onEmojiChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
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
}: Props) {
  const canSave = emoji.trim() && name.trim();

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
          placeholderTextColor="#666"
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
          style={[styles.formAddBtn, !canSave && styles.formAddBtnDisabled]}
        >
          {isEditing ? 'Save' : 'Add'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
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
    backgroundColor: '#3a1a1a',
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
  formAddBtnDisabled: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
  },
});
