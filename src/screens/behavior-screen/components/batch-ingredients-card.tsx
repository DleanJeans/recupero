import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import type { BehaviorEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { getBehaviorAmountField, getBehaviorMetadataFields } from '../../../utils/metadata-calculation-utils';

interface BatchIngredientsCardProps {
  behavior: BehaviorEntry;
}

/** Read-only list of what a cooked batch was made of and how much of each was used. */
export function BatchIngredientsCard({ behavior }: BatchIngredientsCardProps) {
  const behaviors = useBehaviorStore(state => state.behaviors);
  const categories = useBehaviorStore(state => state.categories);
  const batch = behavior.batch;
  if (!batch || batch.ingredients.length === 0) return null;

  const baseUnit = getBehaviorAmountField(behavior, getBehaviorMetadataFields(behavior, categories))?.unit ?? '';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Ingredients used</Text>
      {batch.ingredients.map((ingredient, index) => {
        const source = behaviors.find(candidate => candidate.id === ingredient.behaviorId);
        const unit = source
          ? (getBehaviorAmountField(source, getBehaviorMetadataFields(source, categories))?.unit ?? baseUnit)
          : baseUnit;
        return (
          <View
            key={`${ingredient.behaviorId}-${index}`}
            style={styles.row}
          >
            <Text
              style={styles.name}
              numberOfLines={1}
            >
              {ingredient.name}
            </Text>
            <Text
              style={styles.amount}
              numberOfLines={1}
            >{`${Math.round(ingredient.amount * 10) / 10}${unit ? ` ${unit}` : ''}`}</Text>
          </View>
        );
      })}
      <View style={[styles.row, styles.totalRow]}>
        <Text
          style={styles.name}
          numberOfLines={1}
        >
          Cooked weight
        </Text>
        <Text
          style={styles.amount}
          numberOfLines={1}
        >{`${Math.round(batch.cookedAmount * 10) / 10}${baseUnit ? ` ${baseUnit}` : ''}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: 6,
  },
  title: { color: Colors.text.primary, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  totalRow: { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.border.default },
  name: { flex: 1, minWidth: 0, color: Colors.text.light, fontSize: 13 },
  amount: { flexShrink: 0, color: Colors.text.primary, fontSize: 13, fontWeight: '600' },
});
