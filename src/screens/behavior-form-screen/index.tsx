import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { Alert, Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { BackButton } from '../../components/back-button';
import { Button } from '../../components/button';
import { CategoryPicker } from '../../components/category-picker';
import { CheckboxRow } from '../../components/checkbox-row';
import { CooldownIcon } from '../../components/cooldown-icon';
import { EmojiPicker } from '../../components/emoji-picker';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Text, TextInput } from '../../components/text';
import { useStarMoneyMultipliersForm } from '../../hooks/use-star-money-multipliers-form';
import { useStarThresholdsForm } from '../../hooks/use-star-thresholds-form';
import { useXPDecayForm } from '../../hooks/use-xp-decay-form';
import { useBehaviorStore } from '../../store/behavior-store';
import type { BehaviorEntry, BehaviorType } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import {
  getAmountMetadataFields,
  getOrderedMetadataFields,
  getSelectedAmountMetadataField,
  parseDecimalInput,
} from '../../utils/metadata-calculation-utils';
import { getMoneyRewardAmount, parseVndInput, sanitizeVndInput } from '../../utils/money-utils';
import { BehaviorTypePicker } from './components/behavior-type-picker';
import type { CooldownUnit } from './components/cooldown-input';
import { CooldownInput } from './components/cooldown-input';
import { CooldownTypeToggle } from './components/cooldown-type-toggle';
import { MetadataEditor } from './components/metadata-editor';
import { MoneyRewardInput } from './components/money-reward-input';
import { StarMoneyMultipliersFormField } from './components/star-money-multipliers-form-field';
import { StarThresholdsFormField } from './components/star-thresholds-form-field';
import { XPDecayInput } from './components/xp-decay-input';

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
  const { behaviorId, defaultCategoryId, defaultXpEnabled, defaultDurationXpEnabled, selectedCategoryId } =
    route.params;

  const behavior = useBehaviorStore(
    useCallback(state => (behaviorId ? state.behaviors.find(b => b.id === behaviorId) : undefined), [behaviorId]),
  );
  const categories = useBehaviorStore(state => state.categories);

  const isEdit = behavior != null;
  const nameRef = useRef<RNTextInput>(null);
  const savedRef = useRef<boolean>(false);
  const skipInitialHydration = useRef(behavior != null);
  const appliedSelectedCategoryIdRef = useRef<string | undefined>(undefined);

  const [name, setName] = useState(() => behavior?.name ?? '');
  const [icon, setIcon] = useState(() => iconFromStore(behavior?.icon));
  const [categoryId, setCategoryId] = useState<string | undefined>(behavior ? behavior.categoryId : defaultCategoryId);
  const handleCategoryChange = (id: string | undefined | null) => setCategoryId(id ?? undefined);
  const [emojiKeyboardOpen, setEmojiKeyboardOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(() => behavior?.private ?? false);
  // Existing behaviors inherit their saved state; new behaviors can receive route-specific defaults.
  const [xpEnabled, setXpEnabled] = useState(() =>
    behavior ? behavior.xpEnabled === true : defaultXpEnabled === true,
  );
  const [durationXpEnabled, setDurationXpEnabled] = useState(() =>
    behavior ? behavior.durationXpEnabled === true : defaultDurationXpEnabled === true,
  );
  const [hideTotalXp, setHideTotalXp] = useState(() => behavior?.hideTotalXp === true);
  const [moneyReward, setMoneyReward] = useState(() => behavior?.type !== 'neutral' && behavior?.moneyReward != null);
  const [moneyRewardAmount, setMoneyRewardAmount] = useState(() =>
    String(
      getMoneyRewardAmount(
        behavior?.moneyReward,
        behavior
          ? behavior.xpEnabled === true && behavior.durationXpEnabled === true
          : defaultXpEnabled === true && defaultDurationXpEnabled === true,
      ),
    ),
  );
  const [moneyRewardAmountTouched, setMoneyRewardAmountTouched] = useState(() => behavior?.moneyReward != null);
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
  const [metadataOrder, setMetadataOrder] = useState<string[] | undefined>(() => behavior?.metadataOrder);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const moneyRewardDurationBased = xpEnabled && durationXpEnabled;
  const handleDurationXpToggle = () => {
    const nextEnabled = !durationXpEnabled;
    setDurationXpEnabled(nextEnabled);
    if (nextEnabled && moneyReward && !moneyRewardAmountTouched) {
      setMoneyRewardAmount(String(getMoneyRewardAmount(undefined, true)));
    }
  };
  const handleMoneyRewardToggle = () => {
    if (type === 'neutral') return;
    const nextEnabled = !moneyReward;
    setMoneyReward(nextEnabled);
    if (nextEnabled && moneyRewardDurationBased && !moneyRewardAmountTouched) {
      setMoneyRewardAmount(String(getMoneyRewardAmount(undefined, true)));
    }
  };
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
    inputs: starMoneyMultiplierInputs,
    validationError: starMoneyMultiplierValidationError,
    parsedMultipliers,
    changed: starMoneyMultiplierFormChanged,
    handleInputChange: handleStarMoneyMultiplierInputChange,
    setValidationError: setStarMoneyMultiplierValidationError,
  } = useStarMoneyMultipliersForm(behavior, isEdit);

  const {
    enabled: xpDecayEnabled,
    every: xpDecayEvery,
    unit: xpDecayUnit,
    xpDecayChanged,
    handleToggle: handleXpDecayToggle,
    handleChangeEvery: handleXpDecayChangeEvery,
    handleUnitChange: handleXpDecayUnitChange,
    serialized: xpDecaySerialized,
  } = useXPDecayForm(behavior, isEdit);

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
    setHideTotalXp(behavior.hideTotalXp === true);
    setMoneyReward(behavior.type !== 'neutral' && behavior.moneyReward != null);
    setMoneyRewardAmount(
      String(
        getMoneyRewardAmount(behavior.moneyReward, behavior.xpEnabled === true && behavior.durationXpEnabled === true),
      ),
    );
    setMoneyRewardAmountTouched(behavior.moneyReward != null);
    setCooldownMinutes(behavior.cooldownMinutes || 0);
    setCooldownType(behavior.cooldownType || 'rest');
    setCooldownUnit(behavior.cooldownUnit);
    setCooldownEnabled(behavior.cooldownEnabled ?? !!behavior.cooldownMinutes);
    setBehaviorDefaultMetadata(
      Object.fromEntries(Object.entries(behavior.defaultMetadata ?? {}).map(([k, v]) => [k, String(v)])),
    );
    setMetadataAmountFieldKey(behavior.metadataAmountFieldKey);
    setMetadataOrder(behavior.metadataOrder);
  }, [behavior]);

  useEffect(() => {
    if (!selectedCategoryId || appliedSelectedCategoryIdRef.current === selectedCategoryId) return;
    if (!categories.some(c => c.id === selectedCategoryId)) return;
    appliedSelectedCategoryIdRef.current = selectedCategoryId;
    setCategoryId(selectedCategoryId);
    navigation.setParams({ selectedCategoryId: undefined });
  }, [categories, navigation, selectedCategoryId]);

  useEffect(() => {
    if (!categoryId || categories.some(c => c.id === categoryId)) return;
    setCategoryId(undefined);
  }, [categories, categoryId]);

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

  const savedMoneyRewardAmount = getMoneyRewardAmount(
    behavior?.moneyReward,
    behavior?.xpEnabled === true && behavior?.durationXpEnabled === true,
  );
  const moneyRewardEnabled = type !== 'neutral' && moneyReward;
  const starMoneyMultipliersEnabled = starsEnabled && moneyRewardEnabled;
  const starMoneyMultipliersChanged = starMoneyMultipliersEnabled
    ? starMoneyMultiplierFormChanged
    : behavior?.starMoneyMultipliers != null;
  const starMoneyMultipliersInvalid = starMoneyMultipliersEnabled && parsedMultipliers.values == null;
  const savedMoneyRewardEnabled = behavior?.type !== 'neutral' && behavior?.moneyReward != null;
  const moneyRewardInputInvalid = moneyRewardEnabled && moneyRewardAmount.trim() === '';
  const moneyRewardAmountChanged =
    moneyRewardEnabled && (moneyRewardInputInvalid || parseVndInput(moneyRewardAmount) !== savedMoneyRewardAmount);

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
      hideTotalXp !== (behavior.hideTotalXp === true) ||
      moneyRewardEnabled !== savedMoneyRewardEnabled ||
      moneyRewardAmountChanged ||
      starMoneyMultipliersChanged ||
      cooldownEnabled !== (behavior.cooldownEnabled ?? !!behavior.cooldownMinutes) ||
      cooldownMinutes !== (behavior.cooldownMinutes || 0) ||
      cooldownType !== (behavior.cooldownType || 'rest') ||
      cooldownUnit !== behavior.cooldownUnit ||
      defaultMetadataChanged ||
      JSON.stringify(metadataOrder ?? []) !== JSON.stringify(behavior.metadataOrder ?? []) ||
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
    if (moneyRewardInputInvalid) return;
    if (starMoneyMultipliersInvalid) {
      setStarMoneyMultiplierValidationError(parsedMultipliers.error);
      return;
    }
    const moneyRewardConfig = moneyRewardEnabled ? parseVndInput(moneyRewardAmount) : undefined;
    const starMoneyMultipliersConfig = starMoneyMultipliersEnabled
      ? (parsedMultipliers.values ?? undefined)
      : undefined;
    const defaultMetadataObj = Object.fromEntries(
      Object.entries(behaviorDefaultMetadata)
        .map(([k, v]) => [k, parseDecimalInput(v)] as const)
        .filter((entry): entry is readonly [string, number] => entry[1] != null && entry[1] !== 0),
    );
    const savedMetadataOrder = getOrderedMetadataFields(metadataFields, metadataOrder).map(field => field.key);
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
        metadataOrder: metadataOrder?.length ? savedMetadataOrder : undefined,
        starThresholds: starsEnabled ? (parsedStars.values ?? undefined) : undefined,
        starPeriod: starsEnabled ? starPeriod : undefined,
        starMoneyMultipliers: starMoneyMultipliersConfig,
        // XP is opt-in. When off, preserve the existing xpDecay config (it's ignored at runtime).
        xpEnabled: xpEnabled ? true : undefined,
        xpDecay: xpEnabled ? (xpDecayEnabled ? xpDecaySerialized : undefined) : behavior?.xpDecay,
        durationXpEnabled: xpEnabled && durationXpEnabled ? true : undefined,
        hideTotalXp: xpEnabled && hideTotalXp ? true : undefined,
        moneyReward: moneyRewardConfig,
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
        metadataOrder?.length ? savedMetadataOrder : undefined,
        starsEnabled ? (parsedStars.values ?? undefined) : undefined,
        starsEnabled ? starPeriod : undefined,
        starMoneyMultipliersConfig,
        xpEnabled ? true : undefined,
        xpDecayEnabled ? xpDecaySerialized : undefined,
        cooldownEnabled,
        xpEnabled && durationXpEnabled ? true : undefined,
        xpEnabled && hideTotalXp ? true : undefined,
        moneyRewardConfig,
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
            forceShowNames
            selectCreatedCategoryOnSave
          />

          <MetadataEditor
            categoryId={categoryId}
            categories={categories}
            defaults={behaviorDefaultMetadata}
            amountFieldKey={selectedAmountField?.key}
            onChange={setBehaviorDefaultMetadata}
            onAmountFieldChange={setMetadataAmountFieldKey}
            metadataOrder={metadataOrder}
            onMetadataOrderChange={setMetadataOrder}
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
                  onToggle={handleDurationXpToggle}
                  variant="row"
                />
                <XPDecayInput
                  enabled={xpDecayEnabled}
                  every={xpDecayEvery}
                  unit={xpDecayUnit}
                  onToggle={handleXpDecayToggle}
                  onChangeEvery={handleXpDecayChangeEvery}
                  onUnitChange={handleXpDecayUnitChange}
                />
                <CheckboxRow
                  label="Hide Total XP"
                  hint="Hide lifetime XP in habit details"
                  checked={hideTotalXp}
                  onToggle={() => setHideTotalXp(v => !v)}
                  variant="row"
                />
              </View>
            )}
          </CheckboxRow>

          <CheckboxRow
            label={type === 'undesirable' ? 'Money penalty' : 'Reward money'}
            hint={type === 'neutral' ? 'Neutral logs do not change money' : undefined}
            checked={moneyRewardEnabled}
            disabled={type === 'neutral'}
            onToggle={handleMoneyRewardToggle}
          >
            {moneyRewardEnabled && (
              <View style={styles.moneyOptions}>
                <MoneyRewardInput
                  value={moneyRewardAmount}
                  rateLabel={moneyRewardDurationBased ? 'per minute' : 'per log'}
                  negative={type === 'undesirable'}
                  onChangeText={value => {
                    setMoneyRewardAmountTouched(true);
                    setMoneyRewardAmount(sanitizeVndInput(value));
                  }}
                />
                {starsEnabled && (
                  <StarMoneyMultipliersFormField
                    inputs={starMoneyMultiplierInputs}
                    validationError={starMoneyMultiplierValidationError ?? parsedMultipliers.error}
                    onInputChange={handleStarMoneyMultiplierInputChange}
                  />
                )}
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
        <Button
          variant="primary"
          fab
          onPress={handleSave}
          disabled={
            isEdit
              ? !hasChanges || moneyRewardInputInvalid || starMoneyMultipliersInvalid
              : !name.trim() || !icon.trim() || moneyRewardInputInvalid || starMoneyMultipliersInvalid
          }
        >
          {isEdit ? 'Save' : 'Add'}
        </Button>
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
  moneyOptions: {
    gap: 12,
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
});
