import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '../../components/button';
import { CueScreenHeader } from '../../components/cues/cue-screen-header';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { EmojiPicker } from '../../components/emoji-picker';
import { SafeAreaView } from '../../components/safe-area-view';
import { Text, TextInput } from '../../components/text';
import { useBehaviorStore } from '../../store/behavior-store';
import type { BehaviorEntry } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
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
  getCalculatedMetadataFields,
  parseDecimalInput,
} from '../../utils/metadata-calculation-utils';
import { StackBehaviorPickerModal } from '../behavior-screen/components/stack-behavior-picker-modal';
import { BatchIngredientRow } from './components/batch-ingredient-row';
import { BatchTotalsCard } from './components/batch-totals-card';

type MealBatchFormRoute = NativeStackScreenProps<RootStackParamList, 'MealBatchForm'>['route'];
type DraftIngredient = { key: string; behaviorId: string; amountText: string };

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

  const [name, setName] = useState(existing ? stripBatchNameDate(existing.name) : '');
  const [emoji, setEmoji] = useState(typeof existing?.icon === 'string' ? existing.icon : '🍲');
  const [rows, setRows] = useState<DraftIngredient[]>(() =>
    (existing?.batch?.ingredients ?? []).map(ingredient => ({
      key: uuidv4(),
      behaviorId: ingredient.behaviorId,
      amountText: String(ingredient.amount),
    })),
  );
  const [cookedText, setCookedText] = useState(existing?.batch ? String(existing.batch.cookedAmount) : '');
  const [portionsText, setPortionsText] = useState(
    existing?.batch?.plannedPortions ? String(existing.batch.plannedPortions) : '',
  );
  const [pickerOpen, setPickerOpen] = useState(false);

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
  const amountSource = ingredientBehaviors.find(behavior => behavior.categoryId === picked?.category.id);
  const amountField = amountSource ? getBehaviorAmountField(amountSource, fields) : undefined;
  const unit = amountField?.unit ?? '';

  const inputs = rows.flatMap(row => {
    const behavior = behaviors.find(candidate => candidate.id === row.behaviorId);
    const amount = parseDecimalInput(row.amountText);
    return behavior && amount != null ? [{ behavior, amount }] : [];
  });
  const cooked = parseDecimalInput(cookedText);
  const portions = parseDecimalInput(portionsText);
  const totals = useMemo(() => sumBatchTotals(fields, inputs), [fields, inputs]);
  const rates = getBatchRates(totals, cooked ?? 0, RATE_BASIS);
  const suggestedPortion = getSuggestedPortionAmount(cooked ?? 0, portions ?? undefined);
  const portionValues = getPortionValues(totals, cooked ?? 0, suggestedPortion ?? 0);
  const rawTotal = inputs.reduce((sum, input) => sum + input.amount, 0);

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
    const first = calculatedFields.find(field => own[field.key] != null);
    if (!first) return { text: 'Enter the raw amount', warn: false };
    return {
      text: `${Math.round(own[first.key] * 10) / 10}${first.unit ? ` ${first.unit}` : ''} ${first.label}`,
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
      finishedAt: existing?.batch?.finishedAt,
    };
    const fullName = buildBatchName(trimmedName, batch.cookedAt);
    if (existing) {
      updateBehavior(existing.id, { name: fullName, icon: emoji || undefined, defaultMetadata, batch });
      navigation.goBack();
      return;
    }
    const id = addBatchBehavior({
      name: fullName,
      icon: emoji || '🍲',
      type: amountSource.type,
      categoryId: picked.category.id,
      metadataAmountFieldKey: amountField.key,
      defaultMetadata,
      batch,
    });
    navigation.replace('BehaviorLog', { behaviorId: id, initialMode: 'log' });
  };

  const basisLabel = `per ${RATE_BASIS}${unit ? ` ${unit}` : ''}`;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <CueScreenHeader
        title={existing ? 'Edit batch' : 'Cook a batch'}
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
          <CueSectionLabel>{`Ingredients · raw amount${unit ? ` (${unit})` : ''}`}</CueSectionLabel>
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
                unit={unit}
                onChangeAmount={text =>
                  setRows(current => current.map(item => (item.key === row.key ? { ...item, amountText: text } : item)))
                }
                onRemove={() => setRows(current => current.filter(item => item.key !== row.key))}
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
                value={cookedText}
                onChangeText={setCookedText}
                keyboardType="decimal-pad"
                placeholder={rawTotal > 0 ? `raw ${Math.round(rawTotal)}` : '0'}
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
          <Text style={styles.hint}>
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
        {existing && <Text style={styles.hint}>Saving recalculates the macros of portions you already logged.</Text>}
      </ScrollView>

      <StackBehaviorPickerModal
        visible={pickerOpen}
        excludeIds={rows.map(row => row.behaviorId)}
        onClose={() => setPickerOpen(false)}
        onPickMany={addIngredients}
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
  hint: { color: Colors.text.faint, fontSize: 12, lineHeight: 17 },
  cookedRow: { flexDirection: 'row', gap: 10 },
  cookedField: { flex: 1, gap: 4 },
  fieldLabel: { color: Colors.text.muted, fontSize: 11, fontWeight: '600' },
});
