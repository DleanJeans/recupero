import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry } from '../types/behavior';
import type { CooldownType } from '../utils/cooldownUtils';
import { CategoryPicker } from './CategoryPicker';
import { CooldownIcon } from './CooldownIcon';
import { CooldownInput } from './CooldownInput';
import { Text, TextInput } from './Text';

interface Props {
  /** If provided, the form starts pre-populated in Edit mode. Omit for Create mode. */
  behavior?: BehaviorEntry;
  /** Called after the behavior is created/updated or the form is cancelled. */
  onClose: () => void;
}

function iconFromStore(icon: BehaviorEntry['icon']): string {
  if (!icon) return '';
  if (typeof icon === 'object' && 'uri' in icon) return icon.uri;
  return icon;
}

function iconForStore(raw: string): BehaviorEntry['icon'] {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? { uri: trimmed } : trimmed;
}

export function BehaviorForm({ behavior, onClose }: Props) {
  const isEdit = behavior != null;
  const nameRef = useRef<import('react-native').TextInput>(null);
  const { categories } = useBehaviorStore();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [cooldownMinutes, setCooldownMinutes] = useState(0);
  const [cooldownType, setCooldownType] = useState<CooldownType>('rest');

  useEffect(() => {
    if (!behavior) return;
    setName(behavior.name);
    setIcon(iconFromStore(behavior.icon));
    setCategoryId(behavior.categoryId);
    setCooldownMinutes(behavior.cooldownMinutes || 0);
    setCooldownType(behavior.cooldownType || 'rest');
  }, [behavior]);

  const handleSave = () => {
    const { addBehavior, updateBehavior } = useBehaviorStore.getState();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isEdit && behavior) {
      updateBehavior(behavior.id, {
        name: trimmed,
        icon: iconForStore(icon),
        cooldownMinutes,
        cooldownType,
        categoryId: categoryId || undefined,
      });
    } else {
      addBehavior(trimmed, iconForStore(icon), cooldownMinutes, cooldownType, categoryId || undefined);
    }
    onClose();
  };

  return (
    <KeyboardAvoidingView behavior="position" /* DO NOT change */>
      <View style={styles.form}>
        <View style={styles.row}>
          <IconInput
            value={icon}
            onChangeText={setIcon}
            onNext={() => nameRef.current?.focus()}
          />
          <NameInput
            ref={nameRef}
            value={name}
            onChangeText={setName}
            onSubmit={handleSave}
          />
        </View>
        <View style={styles.cooldownSection}>
          <View style={styles.cooldownLabelRow}>
            <CooldownIcon size={14} />
            <Text style={styles.cooldownLabel}>Cooldown (optional)</Text>
            <CooldownTypeToggle
              value={cooldownType}
              onChange={setCooldownType}
            />
          </View>
          <CooldownInput
            cooldownMinutes={cooldownMinutes}
            onChange={setCooldownMinutes}
          />
        </View>
        <CategoryPicker
          categories={categories}
          selectedId={categoryId}
          onChange={setCategoryId}
        />
        <FormActions
          onCancel={onClose}
          onSubmit={handleSave}
          submitLabel={isEdit ? 'Save' : 'Add'}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// #region Sub-components

interface IconInputProps {
  value: string;
  onChangeText: (v: string) => void;
  onNext: () => void;
}
function IconInput({ value, onChangeText, onNext }: IconInputProps) {
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

interface NameInputProps {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
}
const NameInput = React.forwardRef<import('react-native').TextInput, NameInputProps>(function NameInput(
  { value, onChangeText, onSubmit },
  ref,
) {
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
});

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
      <Text style={[styles.typeBtnText, active && activeTextStyle]}>{label}</Text>
    </Pressable>
  );
}

function CancelButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={styles.cancelBtn}
      onPress={onPress}
    >
      <Text style={styles.cancelText}>Cancel</Text>
    </Pressable>
  );
}

function ConfirmButton({ onPress, label }: { onPress: () => void; label: string }) {
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
// #endregion

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
