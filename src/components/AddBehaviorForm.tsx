import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { CooldownIcon } from './CooldownIcon';
import { CooldownInput } from './CooldownInput';
import { Text, TextInput } from './Text';

interface Props {
  newIcon: string;
  newName: string;
  cooldownMinutes: number;
  onChangeIcon: (v: string) => void;
  onChangeName: (v: string) => void;
  onChangeCooldown: (v: number) => void;
  onAdd: () => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function AddBehaviorForm({
  newIcon,
  newName,
  cooldownMinutes,
  onChangeIcon,
  onChangeName,
  onChangeCooldown,
  onAdd,
  onCancel,
  submitLabel = 'Add',
}: Props) {
  const nameRef = useRef<import('react-native').TextInput>(null);

  return (
    <KeyboardAvoidingView behavior="padding" /* DO NOT change */>
      <View style={styles.form}>
        <View style={styles.row}>
          <TextInput
            style={styles.iconInput}
            placeholder="🏃"
            placeholderTextColor="#4a4a4a"
            value={newIcon}
            onChangeText={onChangeIcon}
            onSubmitEditing={() => nameRef.current?.focus()}
            returnKeyType="next"
          />
          <TextInput
            ref={nameRef}
            style={styles.nameInput}
            placeholder="Behavior name (e.g. Water, Push-ups)"
            placeholderTextColor="#666"
            value={newName}
            onChangeText={onChangeName}
            autoFocus
            onSubmitEditing={onAdd}
            returnKeyType="done"
          />
        </View>
        <View style={styles.cooldownSection}>
          <View style={styles.cooldownLabelRow}>
            <CooldownIcon size={14} />
            <Text style={styles.cooldownLabel}>Cooldown (optional)</Text>
          </View>
          <CooldownInput
            cooldownMinutes={cooldownMinutes}
            onChange={onChangeCooldown}
          />
        </View>
        <View style={styles.actions}>
          <Pressable
            style={styles.cancelBtn}
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={styles.addBtn}
            onPress={onAdd}
          >
            <Text style={styles.addText}>{submitLabel}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  iconInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 22,
    width: 56,
    textAlign: 'center',
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  cooldownSection: {
    gap: 8,
  },
  cooldownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cooldownLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '600',
  },
  addBtn: {
    flex: 1,
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addText: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '600',
  },
});
