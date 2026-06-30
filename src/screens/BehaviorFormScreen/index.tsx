import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { CategoryPicker } from '../../components/CategoryPicker';
import { CheckboxRow } from '../../components/CheckboxRow';
import { CooldownIcon } from '../../components/CooldownIcon';
import { EmojiPicker } from '../../components/EmojiPicker';
import { SafeAreaView } from '../../components/SafeAreaView';
import { ScreenTitle } from '../../components/ScreenTitle';
import { Text, TextInput } from '../../components/Text';
import { useStarThresholdsForm } from '../../hooks/useStarThresholdsForm';
import { useXpDecayForm } from '../../hooks/useXpDecayForm';
import { useBehaviorStore } from '../../store/behaviorStore';
import type { BehaviorEntry, BehaviorType, Category, MetadataField } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import {
  formatMetadataAmountBasis,
  formatMetadataFieldLabel,
  formatMetadataRateUnit,
  getAmountMetadataFields,
  getCalculatedMetadataFields,
  getManualMetadataFields,
  getSelectedAmountMetadataField,
  sanitizeDecimalInput,
} from '../../utils/metadataCalculationUtils';
import { BehaviorTypePicker } from './components/BehaviorTypePicker';
import type { CooldownUnit } from './components/CooldownInput';
import { CooldownInput } from './components/CooldownInput';
import { CooldownTypeToggle } from './components/CooldownTypeToggle';
import { StarThresholdsFormField } from './components/StarThresholdsFormField';
import { XpDecayInput } from './components/XpDecayInput';

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

  const behavior = useBehaviorStore(
    useCallback(state => (behaviorId ? state.behaviors.find(b => b.id === behaviorId) : undefined), [behaviorId]),
  );
  const categories = useBehaviorStore(state => state.categories);

  const isEdit = behavior != null;
  const nameRef = useRef<RNTextInput>(null);
  const savedRef = useRef<boolean>(false);
  const skipInitialHydration = useRef(behavior != null);

  const [name, setName] = useState(() => behavior?.name ?? '');
  const [icon, setIcon] = useState(() => iconFromStore(behavior?.icon));
  const [categoryId, setCategoryId] = useState<string | undefined>(behavior ? behavior.categoryId : defaultCategoryId);
  const handleCategoryChange = (id: string | undefined | null) => setCategoryId(id ?? undefined);
  const [emojiKeyboardOpen, setEmojiKeyboardOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(() => behavior?.private ?? false);
  // New behaviors default to XP-on; existing behaviors inherit their saved state.
  const [xpEnabled, setXpEnabled] = useState(behavior?.xpEnabled === true);
  const [durationXpEnabled, setDurationXpEnabled] = useState(behavior?.durationXpEnabled === true);
  const [type, setType] = useState<BehaviorType>(behavior?.type ?? 'neutral');
  const [cooldownMinutes, setCooldownMinutes] = useState(() => behavior?.cooldownMinutes || 0);
  const [cooldownType, setCooldownType] = useState<'rest' | 'limit'>(() => behavior?.cooldownType || 'rest');
  const [cooldownUnit, setCooldownUnit] = useState<CooldownUnit | undefined>(() => behavior?.cooldownUnit);
  const [cooldownEnabled, setCooldownEnabled] = useState(
    () => behavior?.cooldownEnabled ?? !!behavior?.cooldownMinutes,
  );
  const handleCooldownToggle = () => setCooldownEnabled(v => !v);
  const [behaviorDefaultMetadata, setBehaviorDefaultMetadata] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(behavior?.defaultMetadata ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const [metadataAmountFieldKey, setMetadataAmountFieldKey] = useState<string | undefined>(
    () => behavior?.metadataAmountFieldKey,
  );
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const selectedCategory = useMemo(() => categories.find(c => c.id === categoryId), [categories, categoryId]);
  const metadataFields = selectedCategory?.metadataFields ?? [];
  const selectedAmountField = getSelectedAmountMetadataField(
    metadataFields,
    metadataAmountFieldKey,
    behavior?.metadataQuantityUnit,
  );

  const {
    enabled: starsEnabled,
    period: starPeriod,
    inputs: starInputs,
    validationError: starValidationError,
    parsedStars,
    starThresholdsChanged,
    starPeriodChanged,
    handleToggle: handleStarsToggle,
    handleInputChange: handleStarInputChange,
    handlePeriodChange: handleStarPeriodChange,
    setValidationError: setStarValidationError,
  } = useStarThresholdsForm(behavior, isEdit);

  const {
    enabled: xpDecayEnabled,
    everyMinutes: xpDecayEveryMinutes,
    unit: xpDecayUnit,
    xpDecayChanged,
    handleToggle: handleXpDecayToggle,
    handleChangeMinutes: handleXpDecayChangeMinutes,
    handleUnitChange: handleXpDecayUnitChange,
    serialized: xpDecaySerialized,
  } = useXpDecayForm(behavior, isEdit);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardOpen(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!behavior) return;
    if (skipInitialHydration.current) {
      skipInitialHydration.current = false;
      return;
    }
    setName(behavior.name);
    setType(behavior.type || 'neutral');
    setIcon(iconFromStore(behavior.icon));
    setCategoryId(behavior.categoryId);
    setIsPrivate(behavior.private ?? false);
    setXpEnabled(behavior.xpEnabled === true);
    setDurationXpEnabled(behavior.durationXpEnabled === true);
    setCooldownMinutes(behavior.cooldownMinutes || 0);
    setCooldownType(behavior.cooldownType || 'rest');
    setCooldownUnit(behavior.cooldownUnit);
    setCooldownEnabled(behavior.cooldownEnabled ?? !!behavior.cooldownMinutes);
    setBehaviorDefaultMetadata(
      Object.fromEntries(Object.entries(behavior.defaultMetadata ?? {}).map(([k, v]) => [k, String(v)])),
    );
    setMetadataAmountFieldKey(behavior.metadataAmountFieldKey);
  }, [behavior]);

  useEffect(() => {
    const amountFields = getAmountMetadataFields(metadataFields);
    if (amountFields.length === 0) {
      if (metadataAmountFieldKey !== undefined) setMetadataAmountFieldKey(undefined);
      return;
    }
    if (!amountFields.some(field => field.key === metadataAmountFieldKey)) {
      setMetadataAmountFieldKey(selectedAmountField?.key);
    }
  }, [metadataAmountFieldKey, metadataFields, selectedAmountField?.key]);

  let defaultMetadataChanged = false;
  if (isEdit && behavior) {
    const orig = behavior.defaultMetadata ?? {};
    const keys = new Set([...Object.keys(orig), ...Object.keys(behaviorDefaultMetadata)]);
    defaultMetadataChanged = [...keys].some(k => String(orig[k] ?? '') !== (behaviorDefaultMetadata[k] ?? ''));
  }

  const hasChanges =
    isEdit &&
    behavior &&
    (name.trim() !== behavior.name ||
      type !== behavior.type ||
      icon.trim() !== iconFromStore(behavior.icon) ||
      categoryId !== behavior.categoryId ||
      isPrivate !== (behavior.private ?? false) ||
      xpEnabled !== (behavior.xpEnabled === true) ||
      durationXpEnabled !== (behavior.durationXpEnabled === true) ||
      cooldownEnabled !== (behavior.cooldownEnabled ?? !!behavior.cooldownMinutes) ||
      cooldownMinutes !== (behavior.cooldownMinutes || 0) ||
      cooldownType !== (behavior.cooldownType || 'rest') ||
      cooldownUnit !== behavior.cooldownUnit ||
      defaultMetadataChanged ||
      selectedAmountField?.key !==
        getSelectedAmountMetadataField(metadataFields, behavior.metadataAmountFieldKey)?.key ||
      starThresholdsChanged ||
      starPeriodChanged ||
      xpDecayChanged);

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
    if (parsedStars.error) {
      setStarValidationError(parsedStars.error);
      return;
    }
    setStarValidationError(null);
    const defaultMetadataObj = Object.fromEntries(
      Object.entries(behaviorDefaultMetadata)
        .filter(([, v]) => v !== '' && v !== '0' && Number.isFinite(Number(v)))
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
        cooldownEnabled,
        private: isPrivate,
        defaultMetadata: defaultMetadataObj,
        metadataAmountFieldKey: selectedAmountField?.key,
        starThresholds: starsEnabled ? (parsedStars.values ?? undefined) : undefined,
        starPeriod: starsEnabled ? starPeriod : undefined,
        // XP is opt-in. When off, preserve the existing xpDecay config (it's ignored at runtime).
        xpEnabled: xpEnabled ? true : undefined,
        xpDecay: xpEnabled ? (xpDecayEnabled ? xpDecaySerialized : undefined) : behavior?.xpDecay,
        durationXpEnabled: xpEnabled && durationXpEnabled ? true : undefined,
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
        selectedAmountField?.key,
        starsEnabled ? (parsedStars.values ?? undefined) : undefined,
        starsEnabled ? starPeriod : undefined,
        xpEnabled ? true : undefined,
        xpDecayEnabled ? xpDecaySerialized : undefined,
        cooldownEnabled,
        xpEnabled && durationXpEnabled ? true : undefined,
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

          <BehaviorTypePicker
            value={type}
            onChange={setType}
          />

          <CategoryPicker
            categories={categories}
            selectedId={categoryId}
            onChange={handleCategoryChange}
            dark
            forceShowNames
            onCategoryCreated={setCategoryId}
            onCategoryDeleted={id => {
              if (categoryId === id) setCategoryId(undefined);
            }}
          />

          <MetadataEditor
            categoryId={categoryId}
            categories={categories}
            defaults={behaviorDefaultMetadata}
            amountFieldKey={selectedAmountField?.key}
            onChange={setBehaviorDefaultMetadata}
            onAmountFieldChange={setMetadataAmountFieldKey}
          />

          <CheckboxRow
            label="Cooldown"
            hint="Limit how often this can be logged"
            checked={cooldownEnabled}
            onToggle={handleCooldownToggle}
          >
            {cooldownEnabled && (
              <View style={styles.cooldownSection}>
                <View style={styles.cooldownLabelRow}>
                  <CooldownIcon size={14} />
                  <Text style={styles.cooldownLabel}>Type</Text>
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
            )}
          </CheckboxRow>

          <StarThresholdsFormField
            enabled={starsEnabled}
            period={starPeriod}
            inputs={starInputs}
            validationError={starValidationError}
            onToggle={handleStarsToggle}
            onInputChange={handleStarInputChange}
            onPeriodChange={handleStarPeriodChange}
          />

          <CheckboxRow
            label="Track XP"
            hint="Show level, XP bar, and decay"
            checked={xpEnabled}
            onToggle={() => setXpEnabled(v => !v)}
          >
            {xpEnabled && (
              <View style={styles.xpOptions}>
                <CheckboxRow
                  label="Track duration for XP"
                  hint="Use start and end time, awarding 1 XP per minute"
                  checked={durationXpEnabled}
                  onToggle={() => setDurationXpEnabled(v => !v)}
                  variant="row"
                />
                <XpDecayInput
                  enabled={xpDecayEnabled}
                  everyMinutes={xpDecayEveryMinutes}
                  unit={xpDecayUnit}
                  onToggle={handleXpDecayToggle}
                  onChangeMinutes={handleXpDecayChangeMinutes}
                  onUnitChange={handleXpDecayUnitChange}
                />
              </View>
            )}
          </CheckboxRow>

          <CheckboxRow
            label="Private"
            checked={isPrivate}
            onToggle={() => setIsPrivate(v => !v)}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {!isKeyboardOpen && (
        <View style={styles.actions}>
          <Button
            variant="primary"
            fab
            onPress={handleSave}
            disabled={isEdit ? !hasChanges : !name.trim() || !icon.trim()}
          >
            {isEdit ? 'Save' : 'Add'}
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

// #region Sub-components

interface NameInputProps {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
}
const NameInput = React.forwardRef<RNTextInput, NameInputProps>(function NameInput(
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
      onSubmitEditing={onSubmit}
      returnKeyType="done"
    />
  );
});

interface MetadataEditorProps {
  categoryId: string | undefined;
  categories: Category[];
  defaults: Record<string, string>;
  amountFieldKey: string | undefined;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onAmountFieldChange: (fieldKey: string) => void;
}

function MetadataEditor({
  categoryId,
  categories,
  defaults,
  amountFieldKey,
  onChange,
  onAmountFieldChange,
}: MetadataEditorProps) {
  const selectedCat = categories.find(c => c.id === categoryId);
  const fields = selectedCat?.metadataFields ?? [];
  if (!fields?.length) return null;

  const amountFields = getAmountMetadataFields(fields);
  const selectedAmountField = getSelectedAmountMetadataField(fields, amountFieldKey);
  const manualFields = getManualMetadataFields(fields);
  const calculatedFields = getCalculatedMetadataFields(fields);

  return (
    <View style={styles.defaultMetaSection}>
      {amountFields.length > 0 && (
        <>
          <Text style={styles.defaultMetaLabel}>Amount unit</Text>
          <View style={styles.quantityUnitRow}>
            {amountFields.map(field => (
              <Pressable
                key={field.key}
                onPress={() => onAmountFieldChange(field.key)}
                style={[
                  styles.quantityUnitOption,
                  selectedAmountField?.key === field.key && styles.quantityUnitOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.quantityUnitOptionText,
                    selectedAmountField?.key === field.key && styles.quantityUnitOptionTextActive,
                  ]}
                >
                  {formatMetadataFieldLabel(field)}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {manualFields.length > 0 && (
        <>
          <Text style={styles.defaultMetaLabel}>Default values</Text>
          {manualFields.map((field: MetadataField) => (
            <MetadataDefaultInput
              key={field.key}
              field={field}
              value={defaults[field.key] ?? ''}
              label={formatMetadataFieldLabel(field)}
              onChange={onChange}
            />
          ))}
        </>
      )}

      {calculatedFields.length > 0 && (
        <>
          <Text style={styles.defaultMetaLabel}>Rates per {formatMetadataAmountBasis(selectedAmountField)}</Text>
          {calculatedFields.map((field: MetadataField) => (
            <MetadataDefaultInput
              key={field.key}
              field={field}
              value={defaults[field.key] ?? ''}
              label={field.label}
              unitLabel={formatMetadataRateUnit(field, selectedAmountField)}
              onChange={onChange}
            />
          ))}
        </>
      )}
    </View>
  );
}

interface MetadataDefaultInputProps {
  field: MetadataField;
  value: string;
  label: string;
  unitLabel?: string;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

function MetadataDefaultInput({ field, value, label, unitLabel, onChange }: MetadataDefaultInputProps) {
  return (
    <View style={styles.defaultMetaRow}>
      <Text style={styles.defaultMetaFieldLabel}>{label}</Text>
      <View style={styles.defaultMetaInputGroup}>
        <TextInput
          style={styles.defaultMetaInput}
          value={value}
          onChangeText={v => onChange(prev => ({ ...prev, [field.key]: sanitizeDecimalInput(v) }))}
          placeholder="0"
          placeholderTextColor={Colors.text.dim}
          keyboardType="decimal-pad"
          returnKeyType="done"
          maxLength={8}
        />
        {unitLabel ? <Text style={styles.defaultMetaUnit}>{unitLabel}</Text> : null}
      </View>
    </View>
  );
}

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
    paddingBottom: 96,
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
  xpOptions: {
    gap: 10,
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
    gap: 8,
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
  defaultMetaInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  defaultMetaUnit: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 48,
  },
  quantityUnitRow: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  quantityUnitOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    backgroundColor: Colors.bg.card,
  },
  quantityUnitOptionActive: {
    backgroundColor: Colors.text.light,
  },
  quantityUnitOptionText: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  quantityUnitOptionTextActive: {
    color: Colors.bg.primary,
  },
});
