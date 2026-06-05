import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import type { CooldownType } from '../utils/cooldownUtils';
import { CooldownIcon } from './CooldownIcon';
import { CooldownInput } from './CooldownInput';
import { Text, TextInput } from './Text';

interface Props {
  newIcon: string;
  newName: string;
  cooldownMinutes: number;
  cooldownType: CooldownType;
  onChangeIcon: (v: string) => void;
  onChangeName: (v: string) => void;
  onChangeCooldown: (v: number) => void;
  onChangeCooldownType: (v: CooldownType) => void;
  onAdd: () => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function AddBehaviorForm({
  newIcon,
  newName,
  cooldownMinutes,
  cooldownType,
  onChangeIcon,
  onChangeName,
  onChangeCooldown,
  onChangeCooldownType,
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
            <View style={styles.typeRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.typeBtn,
                  cooldownType === 'rest' && styles.typeBtnRest,
                  pressed && {
                    opacity: 0.7,
                  },
                ]}
                onPress={() => onChangeCooldownType('rest')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    cooldownType === 'rest' && styles.typeBtnTextRest,
                  ]}
                >
                  Rest
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.typeBtn,
                  cooldownType === 'limit' && styles.typeBtnLimit,
                  pressed && {
                    opacity: 0.7,
                  },
                ]}
                onPress={() => onChangeCooldownType('limit')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    cooldownType === 'limit' && styles.typeBtnTextLimit,
                  ]}
                >
                  Limit
                </Text>
              </Pressable>
            </View>
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
  typeRow: {
    flexDirection: 'row',
    gap: 0,
    marginLeft: 'auto',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  typeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBtnRest: {
    backgroundColor: '#2E7D32',
  },
  typeBtnLimit: {
    backgroundColor: '#C62828',
  },
  typeBtnText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  typeBtnTextRest: {
    color: '#A5D6A7',
    fontWeight: '600',
  },
  typeBtnTextLimit: {
    color: '#EF9A9A',
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
