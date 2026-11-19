import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useSettingsStore } from '../../../store/settings-store';
import { Colors } from '../../../utils/colors';
import { getCookBatchCategoryIds, toggleCookBatchCategory } from '../../../utils/cook-batch-utils';

export function CookBatchSection() {
  const categories = useBehaviorStore(s => s.categories);
  const configured = useSettingsStore(s => s.cookBatchCategoryIds);
  const setIds = useSettingsStore(s => s.setCookBatchCategoryIds);
  const selected = getCookBatchCategoryIds(categories, configured);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>COOK A MEAL BUTTON</Text>
      <View style={styles.card}>
        <Text style={styles.label}>
          Show the Cook a meal button above Add behavior on Routines while one of these categories is selected.
        </Text>
        <View style={styles.chips}>
          {categories.map(c => {
            const on = selected.includes(c.id);
            return (
              <Pressable
                key={c.id}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setIds(toggleCookBatchCategory(selected, c.id))}
              >
                <Text
                  style={[styles.chipText, on && styles.chipTextOn]}
                  numberOfLines={1}
                >
                  {c.emoji} {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, marginHorizontal: 16 },
  sectionTitle: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { backgroundColor: Colors.bg.card, borderRadius: 8, padding: 12, gap: 10 },
  label: { color: Colors.text.secondary, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: Colors.bg.elevated, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: Colors.text.primary },
  chipText: { color: Colors.text.secondary, fontSize: 14 },
  chipTextOn: { color: Colors.bg.black, fontWeight: '600' },
});
