import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry, BehaviorType } from '../types/behavior';
import { Colors } from '../utils/colors';
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
  const [isPrivate, setIsPrivate] = useState(false);
  const [type, setType] = useState<BehaviorType>(behavior?.type ?? 'neutral');
  const [cooldownMinutes, setCooldownMinutes] = useState(0);
  const [cooldownType, setCooldownType] = useState<CooldownType>('rest');
  const [cooldownUnit, setCooldownUnit] = useState<CooldownUnit | undefined>(undefined);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryEmoji, setCategoryEmoji] = useState('');
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (!behavior) return;
    setName(behavior.name);
    setType(behavior.type);
    setIcon(iconFromStore(behavior.icon));
    setCategoryId(behavior.categoryId);
    setIsPrivate(behavior.private ?? false);
    setCooldownMinutes(behavior.cooldownMinutes || 0);
    setCooldownType(behavior.cooldownType || 'rest');
    setCooldownUnit(behavior.cooldownUnit);
  }, [behavior]);

  const hasChanges = isEdit && behavior && (
    name.trim() !== behavior.name ||
    type !== behavior.type ||
    icon.trim() !== iconFromStore(behavior.icon) ||
    categoryId !== behavior.categoryId ||
    isPrivate !== (behavior.private ?? false) ||
    cooldownMinutes !== (behavior.cooldownMinutes || 0) ||
    cooldownType !== (behavior.cooldownType || 'rest') ||
    cooldownUnit !== behavior.cooldownUnit
  );

  const handleSave = () => {
    const { addBehavior, updateBehavior } = useBehaviorStore.getState();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isEdit && behavior) {
      updateBehavior(behavior.id, {
        name: trimmed,
        type,
        icon: iconForStore(icon),
        cooldownMinutes,
        cooldownType,
        categoryId: categoryId || undefined,
        cooldownUnit: cooldownUnit || undefined,
        private: isPrivate,
      });
    } else {
      addBehavior(
        trimmed,
        type,
        iconForStore(icon),
        cooldownMinutes,
        cooldownType,
        categoryId || undefined,
        cooldownUnit || undefined,
        isPrivate,
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
        <TypePicker value={type} onChange={setType} />
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
        <Pressable
          style={({ pressed }) => [
            styles.privateRow,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => setIsPrivate((v) => !v)}
        >
          <View style={[styles.checkbox, isPrivate && styles.checkboxChecked]}>
            {isPrivate && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.privateLabel}>Private</Text>
          <Text style={styles.privateHint}>Hidden when sharing the app</Text>
        </Pressable>
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
          disabled={isEdit ? !hasChanges : !name.trim() || !icon.trim()}
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

interface TypePickerProps {
  value: BehaviorType;
  onChange: (v: BehaviorType) => void;
}
function TypePicker({ value, onChange }: TypePickerProps) {
  return (
    <View style={styles.typeRow}>
      <TypeOption
        label="Undesirable"
        active={value === 'undesirable'}
        activeBtnStyle={styles.typeBtnUndesirable}
        activeTextStyle={styles.typeBtnTextUndesirable}
        onPress={() => onChange('undesirable')}
      />
      <TypeOption
        label="Neutral"
        active={value === 'neutral'}
        activeBtnStyle={styles.typeBtnNeutral}
        activeTextStyle={styles.typeBtnTextNeutral}
        onPress={() => onChange('neutral')}
      />
      <TypeOption
        label="Desirable"
        active={value === 'desirable'}
        activeBtnStyle={styles.typeBtnDesirable}
        activeTextStyle={styles.typeBtnTextDesirable}
        onPress={() => onChange('desirable')}
      />
    </View>
  );
}

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
    backgroundColor: Colors.bgCard,
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
    backgroundColor: Colors.bgInput,
    color: Colors.textPrimary,
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
    color: Colors.textMuted,
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
    borderColor: Colors.borderDefault,
  },
  typeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBtnUndesirable: {
    backgroundColor: '#7f1d1d',
  },
  typeBtnNeutral: {
    backgroundColor: '#1e3a5f',
  },
  typeBtnDesirable: {
    backgroundColor: '#14532d',
  },
  typeBtnRest: {
    backgroundColor: '#2E7D32',
  },
  typeBtnLimit: {
    backgroundColor: '#C62828',
  },
  typeBtnText: {
    color: Colors.textFaint,
    fontSize: 12,
    fontWeight: '500',
  },
  typeBtnTextUndesirable: {
    color: Colors.typeUndesirable,
    fontWeight: '600',
  },
  typeBtnTextNeutral: {
    color: Colors.typeNeutral,
    fontWeight: '600',
  },
  typeBtnTextDesirable: {
    color: Colors.typeDesirable,
    fontWeight: '600',
  },
  typeBtnTextRest: {
    color: Colors.successLight,
    fontWeight: '600',
  },
  typeBtnTextLimit: {
    color: Colors.dangerLight,
    fontWeight: '600',
  },
  privateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bgInput,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  checkmark: {
    color: Colors.bgCard,
    fontSize: 12,
    fontWeight: '700',
  },
  privateLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  privateHint: {
    color: Colors.borderLight,
    fontSize: 12,
    marginLeft: 'auto',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
});
