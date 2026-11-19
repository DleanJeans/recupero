import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScreenModal } from '../../../components/full-screen-modal';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useNeedsStore } from '../../../store/needs-store';
import type { NeedId } from '../../../types/need';
import { Colors } from '../../../utils/colors';
import {
  DEFAULT_HUNGER_FULL_KCAL,
  getMetadataFieldChoices,
  getNeedMetadataSource,
  getSourceFieldKeys,
  NEED_INFO,
} from '../../../utils/need-utils';

interface NeedSourcePickerModalProps {
  needId?: NeedId;
  onClose: () => void;
}

/** Picks the metadata fields that fill a need (several allowed) and, optionally, the categories they come from. */
export function NeedSourcePickerModal({ needId, onClose }: NeedSourcePickerModalProps) {
  const categories = useBehaviorStore(state => state.categories);
  const config = useNeedsStore(state => (needId ? state.needs[needId] : undefined));
  const setMetadataSource = useNeedsStore(state => state.setMetadataSource);
  const insets = useSafeAreaInsets();
  const current = needId && config ? getNeedMetadataSource(needId, config, categories) : undefined;
  const selectedKeys = current ? getSourceFieldKeys(current) : [];
  const categoryFilter = config?.metadataSource?.categoryFilter ?? current?.categoryFilter ?? [];
  const choices = getMetadataFieldChoices(categories, categoryFilter);
  const categoriesWithFields = categories.filter(category => category.metadataFields?.length);
  if (!needId || !config) return null;

  const save = (fieldKeys: string[], filter: string[]) => {
    if (fieldKeys.length === 0 && filter.length === 0) {
      setMetadataSource(needId, null);
      return;
    }
    setMetadataSource(needId, {
      fieldKey: fieldKeys[0] ?? '',
      fieldKeys,
      ...(filter.length ? { categoryFilter: filter } : {}),
      fullAmount: current?.fullAmount ?? (needId === 'hunger' ? DEFAULT_HUNGER_FULL_KCAL : 100),
    });
  };

  const toggleField = (key: string) =>
    save(
      selectedKeys.includes(key) ? selectedKeys.filter(item => item !== key) : [...selectedKeys, key],
      categoryFilter,
    );
  const toggleCategory = (id: string) =>
    save(
      selectedKeys,
      categoryFilter.includes(id) ? categoryFilter.filter(item => item !== id) : [...categoryFilter, id],
    );

  return (
    <FullScreenModal
      title={`${NEED_INFO[needId].label} fills from`}
      onClose={onClose}
    >
      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}>
          <Text style={styles.section}>Categories (none selected = all)</Text>
          <View style={styles.chips}>
            {categoriesWithFields.map(category => {
              const on = categoryFilter.includes(category.id);
              return (
                <Pressable
                  key={category.id}
                  style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
                  onPress={() => toggleCategory(category.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <Text
                    style={[styles.chipText, on && styles.chipTextOn]}
                    numberOfLines={1}
                  >
                    {category.emoji} {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.section}>Metadata (pick one or more; each log adds them up)</Text>
          <Pressable
            style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
            onPress={() => setMetadataSource(needId, null)}
          >
            <Text style={[styles.choiceText, !current && styles.choiceSelected]}>None (only behaviours you pick)</Text>
          </Pressable>
          {choices.map(({ field, categoryName }) => {
            const on = selectedKeys.includes(field.key);
            return (
              <Pressable
                key={field.key}
                style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
                onPress={() => toggleField(field.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
              >
                <Text
                  style={[styles.choiceText, on && styles.choiceSelected]}
                  numberOfLines={1}
                >
                  {on ? '☑ ' : '☐ '}
                  {field.label}
                  {field.unit ? ` (${field.unit})` : ''}
                </Text>
                <Text
                  style={styles.choiceDetail}
                  numberOfLines={1}
                >
                  {categoryName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  sheet: { flex: 1, paddingHorizontal: 16 },
  section: { color: Colors.text.muted, fontSize: 12, marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.bg.elevated,
    maxWidth: '100%',
  },
  chipOn: { backgroundColor: Colors.type.desirable },
  chipText: { color: Colors.text.secondary, fontSize: 13 },
  chipTextOn: { color: Colors.text.primary, fontWeight: '700' },
  choice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.default,
  },
  choiceText: { color: Colors.text.secondary, fontSize: 14, flexShrink: 1 },
  choiceSelected: { color: Colors.type.desirable, fontWeight: '700' },
  choiceDetail: { color: Colors.text.faint, fontSize: 12, flexShrink: 0, maxWidth: '40%' },
});
