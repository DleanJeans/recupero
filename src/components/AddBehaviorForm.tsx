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
          <BehaviorIconInput
            value={newIcon}
            onChangeText={onChangeIcon}
            onNext={() => nameRef.current?.focus()}
          />
          <BehaviorNameInput
            ref={nameRef}
            value={newName}
            onChangeText={onChangeName}
            onSubmit={onAdd}
          />
        </View>
        <View style={styles.cooldownSection}>
          <View style={styles.cooldownLabelRow}>
            <CooldownIcon size={14} />
            <Text style={styles.cooldownLabel}>Cooldown (optional)</Text>
            <CooldownTypeToggle
              value={cooldownType}
              onChange={onChangeCooldownType}
            />
          </View>
          <CooldownInput
            cooldownMinutes={cooldownMinutes}
            onChange={onChangeCooldown}
          />
        </View>
        <FormActions
          onCancel={onCancel}
          onSubmit={onAdd}
          submitLabel={submitLabel}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

interface BehaviorIconInputProps {
  value: string;
  onChangeText: (v: string) => void;
  onNext: () => void;
}
function BehaviorIconInput({ value, onChangeText, onNext }: BehaviorIconInputProps) {
  return (
    <TextInput
      style={styles.iconInput}
      placeholder="🏃"
      placeholderTextColor="#4a4a4a"
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onNext}
      returnKeyType="next"
    />
  );
}

interface BehaviorNameInputProps {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
}
const BehaviorNameInput = React.forwardRef<import('react-native').TextInput, BehaviorNameInputProps>(
  function BehaviorNameInput({ value, onChangeText, onSubmit }, ref) {
    return (
      <TextInput
        ref={ref}
        style={styles.nameInput}
        placeholder="Behavior name (e.g. Water, Push-ups)"
        placeholderTextColor="#666"
        value={value}
        onChangeText={onChangeText}
        autoFocus
        onSubmitEditing={onSubmit}
        returnKeyType="done"
      />
    );
  },
);

interface CooldownTypeToggleProps {
  value: CooldownType;
  onChange: (v: CooldownType) => void;
}
function CooldownTypeToggle({ value, onChange }: CooldownTypeToggleProps) {
  return (
    <View style={styles.typeRow}>
      <TypeOption
        label="Rest"
        active={value === 'rest'}
        activeBtnStyle={styles.typeBtnRest}
        activeTextStyle={styles.typeBtnTextRest}
        onPress={() => onChange('rest')}
      />
      <TypeOption
        label="Limit"
        active={value === 'limit'}
        activeBtnStyle={styles.typeBtnLimit}
        activeTextStyle={styles.typeBtnTextLimit}
        onPress={() => onChange('limit')}
      />
    </View>
  );
}

interface TypeOptionProps {
  label: string;
  active: boolean;
  activeBtnStyle: object;
  activeTextStyle: object;
  onPress: () => void;
}
function TypeOption({ label, active, activeBtnStyle, activeTextStyle, onPress }: TypeOptionProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.typeBtn,
        active && activeBtnStyle,
        pressed && {
          opacity: 0.7,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.typeBtnText,
          active && activeTextStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface CancelButtonProps {
  onPress: () => void;
}
function CancelButton({ onPress }: CancelButtonProps) {
  return (
    <Pressable
      style={styles.cancelBtn}
      onPress={onPress}
    >
      <Text style={styles.cancelText}>Cancel</Text>
    </Pressable>
  );
}

interface ConfirmButtonProps {
  onPress: () => void;
  label: string;
}
function ConfirmButton({ onPress, label }: ConfirmButtonProps) {
  return (
    <Pressable
      style={styles.addBtn}
      onPress={onPress}
    >
      <Text style={styles.addText}>{label}</Text>
    </Pressable>
  );
}

interface FormActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}
function FormActions({ onCancel, onSubmit, submitLabel }: FormActionsProps) {
  return (
    <View style={styles.actions}>
      <CancelButton onPress={onCancel} />
      <ConfirmButton
        onPress={onSubmit}
        label={submitLabel}
      />
    </View>
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
