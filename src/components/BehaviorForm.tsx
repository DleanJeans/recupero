import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry } from '../types/behavior';
import type { CooldownType } from '../utils/cooldownUtils';
import { Button } from './Button';
import { CategoryPicker } from './CategoryPicker';
import { CooldownIcon } from './CooldownIcon';
import type { CooldownUnit } from './CooldownInput';
import { CooldownInput } from './CooldownInput';
import { EmojiPicker } from './EmojiPicker';
import { Text, TextInput } from './Text';

interface Props {
  /** If provided, the form starts pre-populated in Edit mode. Omit for Create mode. */
  behavior?: BehaviorEntry;
  /** Default category selected when creating a new behavior. */
  defaultCategoryId?: string;
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

export function BehaviorForm({ behavior, onClose, defaultCategoryId }: Props) {
  const isEdit = behavior != null;
  const nameRef = useRef<import('react-native').TextInput>(null);
  const { categories } = useBehaviorStore();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(behavior ? behavior.categoryId : defaultCategoryId);
  const handleCategoryChange = (id: string | undefined | null) => setCategoryId(id ?? undefined);
  const [emojiKeyboardOpen, setEmojiKeyboardOpen] = useState(false);
  const [cooldownMinutes, setCooldownMinutes] = useState(0);
  const [cooldownType, setCooldownType] = useState<CooldownType>('rest');
  const [cooldownUnit, setCooldownUnit] = useState<CooldownUnit | undefined>(undefined);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryEmoji, setCategoryEmoji] = useState('');
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (!behavior) return;
    setName(behavior.name);
    setIcon(iconFromStore(behavior.icon));
    setCategoryId(behavior.categoryId);
    setCooldownMinutes(behavior.cooldownMinutes || 0);
    setCooldownType(behavior.cooldownType || 'rest');
    setCooldownUnit(behavior.cooldownUnit);
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
        cooldownUnit: cooldownUnit || undefined,
      });
    } else {
      addBehavior(
        trimmed,
        iconForStore(icon),
        cooldownMinutes,
        cooldownType,
        categoryId || undefined,
        cooldownUnit || undefined,
      );
    }
    onClose();
  };

  return (
    <KeyboardAvoidingView behavior="position" /* DO NOT change */>
      <View style={[styles.form, emojiKeyboardOpen && styles.formWithEmojiOpen]}>
        <View style={styles.row}>
          <EmojiPicker
            value={icon}
            onChangeText={setIcon}
            nameHint={name}
            onPick={() => nameRef.current?.focus()}
            onOpenChange={setEmojiKeyboardOpen}
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
            preferredUnit={cooldownUnit}
            onUnitChange={setCooldownUnit}
          />
        </View>
        <CategoryPicker
          categories={categories}
          selectedId={categoryId}
          onChange={handleCategoryChange}
          isFormOpen={showCategoryForm}
          onToggleForm={() => setShowCategoryForm(v => !v)}
          form={{
            emoji: categoryEmoji,
            name: categoryName,
            isEditing: false,
            onEmojiChange: setCategoryEmoji,
            onNameChange: setCategoryName,
            onSave: () => {
              const trimmedName = categoryName.trim();
              const trimmedEmoji = categoryEmoji.trim();
              if (!trimmedEmoji || !trimmedName) return;
              const { addCategory, categories: cats } = useBehaviorStore.getState();
              addCategory(trimmedName, trimmedEmoji);
              const newCats = useBehaviorStore.getState().categories;
              const newCat = newCats[newCats.length - 1];
              if (newCat) setCategoryId(newCat.id);
              setShowCategoryForm(false);
              setCategoryEmoji('');
              setCategoryName('');
            },
            onCancel: () => {
              setShowCategoryForm(false);
              setCategoryEmoji('');
              setCategoryName('');
            },
            onDelete: () => {},
            dark: true,
          }}
        />
        <FormActions
          onCancel={onClose}
          onSubmit={handleSave}
          submitLabel={isEdit ? 'Save' : 'Add'}
          disabled={!isEdit && (!name.trim() || !icon.trim())}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// #region Sub-components

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
      placeholder="e.g. Water, Push-ups"
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

interface FormActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
}
function FormActions({ onCancel, onSubmit, submitLabel, disabled }: FormActionsProps) {
  return (
    <View style={styles.actions}>
      <Button
        variant="secondary"
        size="lg"
        onPress={onCancel}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        size="lg"
        onPress={onSubmit}
        disabled={disabled}
      >
        {submitLabel}
      </Button>
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
  formWithEmojiOpen: {
    paddingBottom: 320,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
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
});
