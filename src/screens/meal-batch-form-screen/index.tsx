import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorIcon } from '../../components/behavior-icon';
import { Button } from '../../components/button';
import { CueScreenHeader } from '../../components/cues/cue-screen-header';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { EmojiPicker } from '../../components/emoji-picker';
import { SafeAreaView } from '../../components/safe-area-view';
import { Text, TextInput } from '../../components/text';
import { useBehaviorStore } from '../../store/behavior-store';
import {
  type DraftIngredient,
  EMPTY_MEAL_BATCH_DRAFT,
  useMealBatchDraftStore,
} from '../../store/meal-batch-draft-store';
import { useSettingsStore } from '../../store/settings-store';
import { useTimerStore } from '../../store/timer-store';
import type { BehaviorEntry } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { getCookBatchCategoryIds } from '../../utils/cook-batch-utils';
import {
  buildBatchName,
  getBatchRates,
  getIngredientTotals,
  getPortionValues,
  getSuggestedPortionAmount,
  pickBatchCategory,
  stripBatchNameDate,
  sumBatchTotals,
} from '../../utils/meal-batch-utils';
import {
  getBehaviorAmountField,
  getBehaviorMetadataFields,
  getCalculatedMetadataFields,
  parseDecimalInput,
} from '../../utils/metadata-calculation-utils';
import { formatClockDuration } from '../../utils/time-utils';
import { StackBehaviorPickerModal } from '../behavior-screen/components/stack-behavior-picker-modal';
import { BatchIngredientRow } from './components/batch-ingredient-row';
import { BatchTotalsCard } from './components/batch-totals-card';
import { MacroPickerModal } from './components/macro-picker-modal';

type MealBatchFormRoute = NativeStackScreenProps<RootStackParamList, 'MealBatchForm'>['route'];

const RATE_BASIS = 100;

/** "Cook a batch": pick ingredient behaviours, weigh each, enter the cooked weight. Creates (or edits) one food
 *  behaviour whose per-100 rates are the batch totals spread over the cooked weight. */
export function MealBatchFormScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<MealBatchFormRoute>();
  const behaviorId = route.params?.behaviorId;
  const behaviors = useBehaviorStore(state => state.behaviors);
  const categories = useBehaviorStore(state => state.categories);
  const addBatchBehavior = useBehaviorStore(state => state.addBatchBehavior);
  const updateBehavior = useBehaviorStore(state => state.updateBehavior);
  const existing = useMemo(
    () => (behaviorId ? behaviors.find(behavior => behavior.id === behaviorId && behavior.batch) : undefined),
    [behaviorId, behaviors],
  );

  /** A new meal starts from the saved draft, so leaving the screen (ingredient timers, picker) loses nothing. */
  const [initial] = useState(() => (existing ? undefined : useMealBatchDraftStore.getState().draft));
  const [name, setName] = useState(existing ? stripBatchNameDate(existing.name) : (initial?.name ?? ''));
  const [emoji, setEmoji] = useState(
    typeof existing?.icon === 'string' ? existing.icon : (initial?.emoji ?? EMPTY_MEAL_BATCH_DRAFT.emoji),
  );
  const [rows, setRows] = useState<DraftIngredient[]>(() =>
    existing
      ? (existing.batch?.ingredients ?? []).map(ingredient => ({
          key: uuidv4(),
          behaviorId: ingredient.behaviorId,
          amountText: String(ingredient.amount),
        }))
      : (initial?.rows ?? []),
  );
  const [cookedText, setCookedText] = useState(
    existing?.batch ? String(existing.batch.cookedAmount) : (initial?.cookedText ?? ''),
  );
  /** Until the user types a cooked weight, it follows the sum of the raw ingredient amounts. */
  const [cookedEdited, setCookedEdited] = useState(existing?.batch != null || initial?.cookedEdited === true);
  const [portionsText, setPortionsText] = useState(
    existing?.batch?.plannedPortions ? String(existing.batch.plannedPortions) : (initial?.portionsText ?? ''),
  );
  const [baseBehaviorId, setBaseBehaviorId] = useState<string | undefined>(
    existing ? existing.batch?.baseBehaviorId : initial?.baseBehaviorId,
  );
  /** Which calculated macro each ingredient row shows under its name (first one until chosen). */
  const [shownKey, setShownKey] = useState<string | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [basePickerOpen, setBasePickerOpen] = useState(false);
  const baseBehavior = baseBehaviorId ? behaviors.find(behavior => behavior.id === baseBehaviorId) : undefined;
  /** Start of the base behaviour's running timer, if it has one. */
  const baseStart = useTimerStore(state => {
    if (baseBehaviorId == null) return undefined;
    const session = [state, ...state.parked].find(
      candidate =>
        candidate.lockedBehaviorId === baseBehaviorId &&
        candidate.startTimestamp != null &&
        candidate.stopTimestamp == null &&
        candidate.pausedAt == null,
    );
    return session?.startTimestamp;
  });
  const baseRunning = baseStart != null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!baseRunning) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [baseRunning]);

  useEffect(() => {
    if (existing) return;
    useMealBatchDraftStore
      .getState()
      .setDraft({ name, emoji, rows, cookedText, cookedEdited, portionsText, baseBehaviorId });
  }, [existing, name, emoji, rows, cookedText, cookedEdited, portionsText, baseBehaviorId]);

  const discardDraft = () =>
    Alert.alert('Discard this meal?', 'The name, ingredients and weights you entered are cleared.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          const empty = EMPTY_MEAL_BATCH_DRAFT;
          setName(empty.name);
          setEmoji(empty.emoji);
          setRows([]);
          setCookedText('');
          setCookedEdited(false);
          setPortionsText('');
          setBaseBehaviorId(undefined);
          useMealBatchDraftStore.getState().clearDraft();
        },
      },
    ]);

  const startIngredientTimer = (ingredientId: string, ingredientName: string) => {
    useTimerStore.getState().start(ingredientId, Date.now(), ingredientName);
    navigation.navigate('Timer');
  };

  const ingredientBehaviors = useMemo(
    () =>
      rows
        .map(row => behaviors.find(behavior => behavior.id === row.behaviorId))
        .filter((behavior): behavior is BehaviorEntry => behavior != null),
    [rows, behaviors],
  );
  const picked = useMemo(() => pickBatchCategory(ingredientBehaviors, categories), [ingredientBehaviors, categories]);
  const fields = picked?.fields ?? [];
  const calculatedFields = getCalculatedMetadataFields(fields);
  const shownField = calculatedFields.find(field => field.key === shownKey) ?? calculatedFields[0];
  const [macroPickerOpen, setMacroPickerOpen] = useState(false);
  const amountSource = ingredientBehaviors.find(behavior => behavior.categoryId === picked?.category.id);
  const amountField = amountSource ? getBehaviorAmountField(amountSource, fields) : undefined;
  const unit = amountField?.unit ?? '';

  const inputs = rows.flatMap(row => {
    const behavior = behaviors.find(candidate => candidate.id === row.behaviorId);
    const amount = parseDecimalInput(row.amountText);
    return behavior && amount != null ? [{ behavior, amount }] : [];
  });
  const rawTotal = Math.round(inputs.reduce((sum, input) => sum + input.amount, 0) * 100) / 100;
  const shownCookedText = cookedEdited ? cookedText : rawTotal > 0 ? String(rawTotal) : '';
  const cooked = parseDecimalInput(shownCookedText);
  const portions = parseDecimalInput(portionsText);
  const totals = useMemo(() => sumBatchTotals(fields, inputs), [fields, inputs]);
  const rates = getBatchRates(totals, cooked ?? 0, RATE_BASIS);
  const suggestedPortion = getSuggestedPortionAmount(cooked ?? 0, portions ?? undefined);
  const portionValues = getPortionValues(totals, cooked ?? 0, suggestedPortion ?? 0);

  /** Each ingredient is weighed in its own amount unit (g for weight, ml for volume). */
  const getIngredientUnit = (behavior: BehaviorEntry): string =>
    getBehaviorAmountField(behavior, getBehaviorMetadataFields(behavior, categories))?.unit ?? unit;

  const createIngredient = (ingredientName: string): string | undefined => {
    const categoryId =
      picked?.category.id ??
      getCookBatchCategoryIds(categories, useSettingsStore.getState().cookBatchCategoryIds)[0] ??
      undefined;
    useBehaviorStore
      .getState()
      .addBehavior(ingredientName, amountSource?.type ?? 'desirable', undefined, 0, 'rest', categoryId);
    return useBehaviorStore.getState().behaviors.at(-1)?.id;
  };

  const addIngredients = (ids: string[]) => {
    setPickerOpen(false);
    setRows(current => [
      ...current,
      ...ids
        .filter(id => !current.some(row => row.behaviorId === id))
        .map(id => ({ key: uuidv4(), behaviorId: id, amountText: '' })),
    ]);
  };

  const describeIngredient = (behavior: BehaviorEntry, amountText: string): { text: string; warn: boolean } => {
    if (!picked) return { text: 'Pick ingredients that have calculated rates', warn: true };
    if (behavior.categoryId !== picked.category.id) return { text: 'Different category, adds nothing', warn: true };
    const amount = parseDecimalInput(amountText);
    const own = getIngredientTotals(fields, { behavior, amount: amount ?? 0 });
    const keys = Object.keys(own);
    if (keys.length === 0 && (behavior.defaultMetadata == null || Object.keys(behavior.defaultMetadata).length === 0)) {
      return { text: 'No rates saved, adds nothing', warn: true };
    }
    const first =
      calculatedFields.find(field => field.key === shownField?.key) ??
      calculatedFields.find(field => own[field.key] != null);
    if (shownField && own[shownField.key] == null && amount == null)
      return { text: 'Enter the raw amount', warn: false };
    if (!first) return { text: 'Enter the raw amount', warn: false };
    return {
      text: `${Math.round((Number.isFinite(own[first.key]) ? own[first.key] : 0) * 10) / 10}${first.unit ? ` ${first.unit}` : ''} ${first.label}`,
      warn: false,
    };
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name it', 'Give the batch a name, like Chicken rice bowl.');
      return;
    }
    if (!picked || !amountSource || !amountField) {
      Alert.alert('Add ingredients', 'Add ingredients from a category with calculated rates, like Food.');
      return;
    }
    if (inputs.length === 0) {
      Alert.alert('Weigh the ingredients', 'Enter the raw amount of at least one ingredient.');
      return;
    }
    if (cooked == null || cooked <= 0) {
      Alert.alert('Cooked weight', 'Enter the weight of all the cooked food (without the pot).');
      return;
    }
    const defaultMetadata: Record<string, number> = { ...rates };
    if (suggestedPortion != null) defaultMetadata[amountField.key] = suggestedPortion;
    const batch = {
      ingredients: inputs.map(({ behavior, amount }) => ({ behaviorId: behavior.id, name: behavior.name, amount })),
      cookedAmount: cooked,
      plannedPortions: portions != null && portions > 0 ? portions : undefined,
      cookedAt: existing?.batch?.cookedAt ?? Date.now(),
      baseBehaviorId,
      finishedAt: existing?.batch?.finishedAt,
    };
    const fullName = buildBatchName(trimmedName, batch.cookedAt);
    if (existing) {
      updateBehavior(existing.id, { name: fullName, icon: emoji || undefined, defaultMetadata, batch });
      navigation.goBack();
      return;
    }
    // The base behaviour's running timer (e.g. Chicken Soup) ends here and becomes its log, linked to the batch.
    const baseTime = baseBehaviorId ? useTimerStore.getState().takeRunning(baseBehaviorId, Date.now()) : undefined;
    const id = addBatchBehavior({
      name: fullName,
      icon: emoji || '🍲',
      type: amountSource.type,
      categoryId: picked.category.id,
      metadataAmountFieldKey: amountField.key,
      defaultMetadata,
      batch,
      baseTime,
    });
    useMealBatchDraftStore.getState().clearDraft();
    navigation.replace('BehaviorLog', { behaviorId: id, initialMode: 'log' });
  };

  const basisLabel = `per ${RATE_BASIS}${unit ? ` ${unit}` : ''}`;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <CueScreenHeader
        title={existing ? 'Edit batch' : 'Cook a meal'}
        showBalance={false}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.nameRow}>
          <EmojiPicker
            value={emoji}
            onChangeText={setEmoji}
            nameHint={name}
            style={styles.emojiInput}
          />
          <TextInput
            style={[styles.input, styles.nameInput]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Chicken rice bowl"
            placeholderTextColor={Colors.text.faint}
          />
        </View>
        <Text style={styles.hint}>
          Today's date is added to the name, so each batch is its own food you log portions of.
        </Text>

        <View style={styles.section}>
          <CueSectionLabel>Cooked as</CueSectionLabel>
          {baseBehavior ? (
            <View style={styles.baseRow}>
              <BehaviorIcon
                behavior={baseBehavior}
                size={28}
              />
              <View style={styles.baseText}>
                <Text
                  style={styles.baseName}
                  numberOfLines={1}
                >
                  {baseBehavior.name}
                </Text>
                <Text
                  style={styles.baseSub}
                  numberOfLines={1}
                >
                  {baseRunning ? 'Timer running, logged when you create' : 'Not timing'}
                </Text>
              </View>
              {baseStart != null && (
                <Text
                  style={styles.baseClock}
                  numberOfLines={1}
                >
                  {formatClockDuration(now - baseStart)}
                </Text>
              )}
              <Button
                variant="icon"
                onPress={() => setBaseBehaviorId(undefined)}
                accessibilityLabel="Remove base behavior"
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={Colors.text.muted}
                />
              </Button>
            </View>
          ) : (
            <Text style={styles.hint}>
              Optional. Pick the behavior you are cooking this as (like Chicken Soup). Its running timer is logged and
              linked to this meal.
            </Text>
          )}
          <Button
            onPress={() => setBasePickerOpen(true)}
            accessibilityLabel="Choose base behavior"
          >
            {baseBehavior ? 'Change base behavior' : 'Choose base behavior'}
          </Button>
        </View>

        <View style={styles.section}>
          <CueSectionLabel>Ingredients · raw amount</CueSectionLabel>
          {calculatedFields.length > 1 && shownField && (
            <Pressable
              style={styles.macroChip}
              onPress={() => setMacroPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Showing ${shownField.label} per ingredient. Tap to choose`}
            >
              <Ionicons
                name="chevron-down"
                size={14}
                color={Colors.text.muted}
              />
              <Text
                style={styles.macroChipText}
                numberOfLines={1}
              >{`Showing ${shownField.label}`}</Text>
            </Pressable>
          )}
          {rows.map(row => {
            const behavior = behaviors.find(candidate => candidate.id === row.behaviorId);
            const info = behavior
              ? describeIngredient(behavior, row.amountText)
              : { text: 'Deleted behaviour', warn: true };
            return (
              <BatchIngredientRow
                key={row.key}
                name={behavior?.name ?? 'Deleted behaviour'}
                icon={behavior?.icon}
                subtitle={info.text}
                warn={info.warn}
                amountText={row.amountText}
                unit={behavior ? getIngredientUnit(behavior) : unit}
                onChangeAmount={text =>
                  setRows(current => current.map(item => (item.key === row.key ? { ...item, amountText: text } : item)))
                }
                onRemove={() => setRows(current => current.filter(item => item.key !== row.key))}
                onOpenDetails={
                  behavior ? () => navigation.navigate('BehaviorForm', { behaviorId: behavior.id }) : undefined
                }
                onStartTimer={behavior ? () => startIngredientTimer(behavior.id, behavior.name) : undefined}
              />
            );
          })}
          {rows.length === 0 && (
            <Text style={styles.hint}>Add the foods that went into the pot, then weigh each one raw.</Text>
          )}
          <Button
            onPress={() => setPickerOpen(true)}
            accessibilityLabel="Add ingredients"
          >
            + Ingredients
          </Button>
        </View>

        <View style={styles.section}>
          <CueSectionLabel>Cooked</CueSectionLabel>
          <View style={styles.cookedRow}>
            <View style={styles.cookedField}>
              <Text style={styles.fieldLabel}>{`Cooked weight${unit ? ` (${unit})` : ''}`}</Text>
              <TextInput
                style={styles.input}
                value={shownCookedText}
                onChangeText={text => {
                  setCookedEdited(true);
                  setCookedText(text);
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.text.faint}
              />
            </View>
            <View style={styles.cookedField}>
              <Text style={styles.fieldLabel}>Planned portions</Text>
              <TextInput
                style={styles.input}
                value={portionsText}
                onChangeText={setPortionsText}
                keyboardType="decimal-pad"
                placeholder="optional"
                placeholderTextColor={Colors.text.faint}
              />
            </View>
          </View>
          {cookedEdited && rawTotal > 0 && cooked !== rawTotal && (
            <Pressable
              onPress={() => setCookedEdited(false)}
              accessibilityRole="button"
              accessibilityLabel="Use the total of the ingredients"
            >
              <Text style={styles.link}>{`Use total of ingredients (${rawTotal}${unit ? ` ${unit}` : ''})`}</Text>
            </Pressable>
          )}
          <Text style={styles.hint}>
            {!cookedEdited && rawTotal > 0
              ? 'Filled from the ingredients. Type the weighed cooked weight to change it. '
              : ''}
            Weigh all the cooked food without the pot. Water lost or soaked up while cooking is already covered by this.
          </Text>
        </View>

        {cooked != null && cooked > 0 && (
          <View style={styles.section}>
            <CueSectionLabel>Macros</CueSectionLabel>
            <BatchTotalsCard
              fields={calculatedFields}
              totals={totals}
              rates={rates}
              portion={portionValues}
              rateBasisLabel={basisLabel}
              portionLabel={suggestedPortion != null ? `${suggestedPortion}${unit ? ` ${unit}` : ''}` : undefined}
            />
          </View>
        )}

        <Button
          variant="primary"
          onPress={handleSave}
        >
          {existing ? 'Save batch' : 'Create batch'}
        </Button>
        {!existing && (
          <Pressable
            onPress={discardDraft}
            accessibilityRole="button"
            accessibilityLabel="Discard this meal"
          >
            <Text style={styles.link}>Discard this meal</Text>
          </Pressable>
        )}
        {existing && <Text style={styles.hint}>Saving recalculates the macros of portions you already logged.</Text>}
      </ScrollView>

      <StackBehaviorPickerModal
        visible={pickerOpen}
        excludeIds={rows.map(row => row.behaviorId)}
        onClose={() => setPickerOpen(false)}
        onPickMany={addIngredients}
        onCreate={createIngredient}
      />
      <MacroPickerModal
        visible={macroPickerOpen}
        fields={calculatedFields}
        selectedKey={shownField?.key}
        onSelect={key => {
          setShownKey(key);
          setMacroPickerOpen(false);
        }}
        onClose={() => setMacroPickerOpen(false)}
      />
      <StackBehaviorPickerModal
        visible={basePickerOpen}
        excludeIds={[]}
        onClose={() => setBasePickerOpen(false)}
        onPick={id => {
          setBasePickerOpen(false);
          setBaseBehaviorId(id);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { gap: 18, paddingHorizontal: 16 },
  section: { gap: 9 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    height: 46,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 15,
  },
  emojiInput: { width: 56, height: 46, borderRadius: 10 },
  nameInput: { flex: 1, fontSize: 17, fontWeight: '600' },
  link: { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  hint: { color: Colors.text.faint, fontSize: 12, lineHeight: 17 },
  macroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: Colors.bg.input,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  macroChipText: { color: Colors.text.muted, fontSize: 12, fontWeight: '600', flexShrink: 0 },
  baseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 4,
  },
  baseText: { flex: 1, minWidth: 0 },
  baseName: { color: Colors.text.primary, fontSize: 14, fontWeight: '600' },
  baseClock: { color: '#4ade80', fontSize: 16, fontWeight: '700', flexShrink: 0, minWidth: 56, textAlign: 'right' },
  baseSub: { color: Colors.text.muted, fontSize: 11, marginTop: 1 },
  cookedRow: { flexDirection: 'row', gap: 10 },
  cookedField: { flex: 1, gap: 4 },
  fieldLabel: { color: Colors.text.muted, fontSize: 11, fontWeight: '600' },
});
