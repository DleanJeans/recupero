import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useKeyboardVisible } from '../hooks/use-keyboard-visible';
import { Colors } from '../utils/colors';
import { Button } from './button';
import { Text, TextInput } from './text';

interface RenameBehaviorModalProps {
  visible: boolean;
  currentName: string;
  onClose: () => void;
  onSave: (name: string) => void;
}

/** Small dialog for renaming a behavior. Docks to the top while the keyboard is showing. */
export function RenameBehaviorModal({ visible, currentName, onClose, onSave }: RenameBehaviorModalProps) {
  const keyboardUp = useKeyboardVisible();
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (visible) setName(currentName);
  }, [visible, currentName]);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0;

  const save = () => {
    if (!canSave) return;
    if (trimmed !== currentName) onSave(trimmed);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, keyboardUp && styles.overlayTop]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>Rename behavior</Text>
          <TextInput
            style={styles.input}
            placeholder="Behavior name"
            placeholderTextColor={Colors.text.faint}
            value={name}
            onChangeText={setName}
            onSubmitEditing={save}
            returnKeyType="done"
            autoFocus
            selectTextOnFocus
          />
          <View style={styles.actions}>
            <Button
              variant="ghost"
              onPress={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={save}
              disabled={!canSave}
            >
              Save
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayTop: { justifyContent: 'flex-start', paddingTop: 48 },
  sheet: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  input: {
    height: 46,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
