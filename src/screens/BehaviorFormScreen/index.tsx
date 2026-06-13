import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { CategoryPicker } from '../../components/CategoryPicker';
import { CooldownIcon } from '../../components/CooldownIcon';
import { EmojiPicker } from '../../components/EmojiPicker';
import { ScreenTitle } from '../../components/ScreenTitle';
import { Text, TextInput } from '../../components/Text';
import { useBehaviorStore } from '../../store/behaviorStore';
import type { BehaviorEntry, BehaviorType } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import type { CooldownUnit } from './components/CooldownInput';
import { CooldownInput } from './components/CooldownInput';
import { CooldownTypeToggle } from './components/CooldownTypeToggle';
import { TypePicker } from './components/TypePicker';

function iconFromStore(icon: BehaviorEntry['icon']): string {
  if (!icon) return '';
  if (typeof icon === 'object' && 'uri' in icon) return icon.uri;
  return icon;
}

function iconForStore(raw: string): BehaviorEntry['icon'] | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? { uri: trimmed } : trimmed;
}

export function BehaviorFormScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'BehaviorForm'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { behaviorId, defaultCategoryId } = route.params;

  const { behaviors, categories } = useBehaviorStore();
  const behavior = behaviorId ? behaviors.find(b => b.id === behaviorId) : undefined;

  const isEdit = behavior != null;
  const nameRef = useRef<import('react-native').TextInput>(null);
  const savedRef = useRef<boolean>(false);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(behavior ? behavior.categoryId : defaultCategoryId);
  const handleCategoryChange = (id: string | undefined | null) => setCategoryId(id ?? undefined);
  const [emojiKeyboardOpen, setEmojiKeyboardOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [type, setType] = useState<BehaviorType>(behavior?.type ?? 'neutral');
  const [cooldownMinutes, setCooldownMinutes] = useState(0);
  const [cooldownType, setCooldownType] = useState<'rest' | 'limit'>('rest');
  const [cooldownUnit, setCooldownUnit] = useState<CooldownUnit | undefined>(undefined);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryEmoji, setCategoryEmoji] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryMetadataFields, setCategoryMetadataFields] = useState<import('../../types/behavior').MetadataField[]>(
    [],
  );
  const [behaviorDefaultMetadata, setBehaviorDefaultMetadata] = useState<Record<string, string>>({});

  const resetCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategoryId(null);
    setCategoryEmoji('');
    setCategoryName('');
    setCategoryMetadataFields([]);
  };

  useEffect(() => {
    if (!behavior) return;
    setName(behavior.name);
    setType(behavior.type || 'neutral');
    setIcon(iconFromStore(behavior.icon));
    setCategoryId(behavior.categoryId);
    setIsPrivate(behavior.private ?? false);
    setCooldownMinutes(behavior.cooldownMinutes || 0);
    setCooldownType(behavior.cooldownType || 'rest');
    setCooldownUnit(behavior.cooldownUnit);
    setBehaviorDefaultMetadata(
      Object.fromEntries(Object.entries(behavior.defaultMetadata ?? {}).map(([k, v]) => [k, String(v)])),
    );
  }, [behavior]);

  const defaultMetadataChanged =
    isEdit && behavior
      ? (() => {
          const orig = behavior.defaultMetadata ?? {};
          const keys = new Set([...Object.keys(orig), ...Object.keys(behaviorDefaultMetadata)]);
          return [...keys].some(k => String(orig[k] ?? '') !== (behaviorDefaultMetadata[k] ?? ''));
        })()
      : false;

  const hasChanges =
    isEdit &&
    behavior &&
    (name.trim() !== behavior.name ||
      type !== behavior.type ||
      icon.trim() !== iconFromStore(behavior.icon) ||
      categoryId !== behavior.categoryId ||
      isPrivate !== (behavior.private ?? false) ||
      cooldownMinutes !== (behavior.cooldownMinutes || 0) ||
      cooldownType !== (behavior.cooldownType || 'rest') ||
      cooldownUnit !== behavior.cooldownUnit ||
      defaultMetadataChanged);

  const isDirty = isEdit ? !!hasChanges : name.trim().length > 0 || icon.trim().length > 0;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      // Skip the guard when navigation is triggered by a successful save.
      if (savedRef.current) return;
      if (!isDirty) return;
      e.preventDefault();
      Alert.alert('Discard changes?', 'Your changes will not be saved.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.dispatch(e.data.action),
        },
      ]);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  const handleSave = () => {
    const { addBehavior, updateBehavior } = useBehaviorStore.getState();
    const trimmed = name.trim();
    if (!trimmed) return;
    const defaultMetadataObj = Object.fromEntries(
      Object.entries(behaviorDefaultMetadata)
        .filter(([, v]) => v !== '' && v !== '0')
        .map(([k, v]) => [k, Number(v)]),
    );
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
        defaultMetadata: defaultMetadataObj,
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
        defaultMetadataObj,
      );
    }
    savedRef.current = true;
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <ScreenTitle>{isEdit ? 'Edit Behavior' : 'New Behavior'}</ScreenTitle>
      </View>
      <KeyboardAvoidingView
        behavior="height"
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.form, emojiKeyboardOpen && styles.formWithEmojiOpen]}
          keyboardShouldPersistTaps="handled"
        >
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

          <TypePicker
            value={type}
            onChange={setType}
          />

          <View style={styles.cooldownSection}>
            <View style={styles.cooldownLabelRow}>
              <CooldownIcon size={14} />
              <Text style={styles.cooldownLabel}>Cooldown (optional)</Text>
              <CooldownTypeToggle
                value={cooldownType}
                onChange={setCooldownType}
                style={styles.cooldownTypeRow}
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
            style={({ pressed }) => [styles.privateRow, pressed && { opacity: 0.7 }]}
            onPress={() => setIsPrivate(v => !v)}
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
            onLongPress={cat => {
              setEditingCategoryId(cat.id);
              setCategoryEmoji(cat.emoji);
              setCategoryName(cat.name);
              setCategoryMetadataFields(cat.metadataFields ?? []);
              setShowCategoryForm(true);
            }}
            isFormOpen={showCategoryForm}
            onToggleForm={() => {
              if (!showCategoryForm) {
                resetCategoryForm();
              }
              setShowCategoryForm(v => !v);
            }}
            form={{
              emoji: categoryEmoji,
              name: categoryName,
              isEditing: editingCategoryId != null,
              onEmojiChange: setCategoryEmoji,
              onNameChange: setCategoryName,
              metadataFields: categoryMetadataFields,
              onMetadataFieldsChange: setCategoryMetadataFields,
              onSave: () => {
                const trimmedName = categoryName.trim();
                const trimmedEmoji = categoryEmoji.trim();
                if (!trimmedEmoji || !trimmedName) return;
                const store = useBehaviorStore.getState();
                if (editingCategoryId) {
                  store.updateCategory(editingCategoryId, {
                    name: trimmedName,
                    emoji: trimmedEmoji,
                    metadataFields: categoryMetadataFields.length > 0 ? categoryMetadataFields : undefined,
                  });
                } else {
                  store.addCategory(
                    trimmedName,
                    trimmedEmoji,
                    categoryMetadataFields.length > 0 ? categoryMetadataFields : undefined,
                  );
                  const newCats = useBehaviorStore.getState().categories;
                  const newCat = newCats[newCats.length - 1];
                  if (newCat) setCategoryId(newCat.id);
                }
                resetCategoryForm();
              },
              onCancel: () => {
                resetCategoryForm();
              },
              onDelete: () => {
                if (!editingCategoryId) return;
                const store = useBehaviorStore.getState();
                store.removeCategory(editingCategoryId);
                if (categoryId === editingCategoryId) {
                  setCategoryId(undefined);
                }
                resetCategoryForm();
              },
              dark: true,
            }}
          />
          {(() => {
            const selectedCat = categories.find(c => c.id === categoryId);
            const fields = selectedCat?.metadataFields;
            if (!fields?.length) return null;
            return (
              <View style={styles.defaultMetaSection}>
                <Text style={styles.defaultMetaLabel}>Default values</Text>
                {fields.map(field => (
                  <View
                    key={field.key}
                    style={styles.defaultMetaRow}
                  >
                    <Text style={styles.defaultMetaFieldLabel}>
                      {field.label}
                      {field.unit ? ` (${field.unit})` : ''}
                    </Text>
                    <TextInput
                      style={styles.defaultMetaInput}
                      value={behaviorDefaultMetadata[field.key] ?? ''}
                      onChangeText={v =>
                        setBehaviorDefaultMetadata(prev => ({ ...prev, [field.key]: v.replace(/[^0-9.]/g, '') }))
                      }
                      placeholder="0"
                      placeholderTextColor={Colors.text.dim}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      maxLength={8}
                    />
                  </View>
                ))}
              </View>
            );
          })()}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          style={styles.primaryAction}
          onPress={handleSave}
          disabled={isEdit ? !hasChanges : !name.trim() || !icon.trim()}
        >
          {isEdit ? 'Save' : 'Add'}
        </Button>
      </View>
    </SafeAreaView>
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
      placeholderTextColor={Colors.text.faint}
      value={value}
      onChangeText={onChangeText}
      autoFocus
      onSubmitEditing={onSubmit}
      returnKeyType="done"
    />
  );
});

// #endregion

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 4,
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 20,
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
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
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
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 0,
    alignSelf: 'center',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cooldownTypeRow: {
    marginLeft: 'auto',
    alignSelf: 'auto',
  },
  privateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.text.primary,
    borderColor: Colors.text.primary,
  },
  checkmark: {
    color: Colors.bg.card,
    fontSize: 12,
    fontWeight: '700',
  },
  privateLabel: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  privateHint: {
    color: Colors.border.light,
    fontSize: 12,
    marginLeft: 'auto',
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  defaultMetaSection: {
    gap: 6,
    marginTop: 12,
  },
  defaultMetaLabel: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  defaultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  defaultMetaFieldLabel: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  defaultMetaInput: {
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text.primary,
    fontSize: 14,
    width: 80,
    textAlign: 'right',
  },
  primaryAction: { flex: 0, width: '100%' },
});
