import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../store/behaviorStore';
import { getDailyMetadataTotals } from '../utils/behaviorUtils';
import { Colors } from '../utils/colors';
import { toDateString } from '../utils/dateUtils';
import { Text } from './Text';

interface Props {
  selectedCategoryId: string | null;
}

export function CategoryMetadataTotals({ selectedCategoryId }: Props) {
  const { behaviors, categories } = useBehaviorStore();

  const totals = useMemo(() => {
    if (selectedCategoryId === null) return null;
    const category = categories.find(c => c.id === selectedCategoryId);
    if (!category || !category.metadataFields?.length) return null;

    const today = toDateString(new Date());
    return getDailyMetadataTotals(behaviors, category, today);
  }, [behaviors, categories, selectedCategoryId]);

  if (!totals || Object.keys(totals).length === 0) return null;

  const category = categories.find(c => c.id === selectedCategoryId)!;

  return (
    <View style={styles.container}>
      {category.metadataFields?.map(field => {
        const val = totals[field.key];
        if (val == null) return null;
        return (
          <View
            key={field.key}
            style={styles.chip}
          >
            <Text style={styles.chipText}>
              {field.label}: {val}
              {field.unit ?? ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: Colors.bg.darker,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
