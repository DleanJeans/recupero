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
  NEED_INFO,
} from '../../../utils/need-utils';

interface NeedSourcePickerModalProps {
  needId?: NeedId;
  onClose: () => void;
}

/** Picks the metadata field that fills a need, or none. */
export function NeedSourcePickerModal({ needId, onClose }: NeedSourcePickerModalProps) {
  const categories = useBehaviorStore(state => state.categories);
  const config = useNeedsStore(state => (needId ? state.needs[needId] : undefined));
  const setMetadataSource = useNeedsStore(state => state.setMetadataSource);
  const insets = useSafeAreaInsets();
  const choices = getMetadataFieldChoices(categories);
  if (!needId || !config) return null;
  const current = getNeedMetadataSource(needId, config, categories);

  const choose = (fieldKey: string | null) => {
    if (fieldKey == null) setMetadataSource(needId, null);
    else {
      const keep = current?.fieldKey === fieldKey ? current.fullAmount : undefined;
      setMetadataSource(needId, {
        fieldKey,
        fullAmount: keep ?? (needId === 'hunger' ? DEFAULT_HUNGER_FULL_KCAL : 100),
      });
    }
    onClose();
  };

  return (
    <FullScreenModal
      title={`${NEED_INFO[needId].label} fills from`}
      onClose={onClose}
    >
      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}>
          <Pressable
            style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
            onPress={() => choose(null)}
          >
            <Text style={[styles.choiceText, !current && styles.choiceSelected]}>None (only behaviours you pick)</Text>
          </Pressable>
          {choices.map(({ field, categoryName }) => (
            <Pressable
              key={field.key}
              style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
              onPress={() => choose(field.key)}
            >
              <Text style={[styles.choiceText, current?.fieldKey === field.key && styles.choiceSelected]}>
                {field.label}
                {field.unit ? ` (${field.unit})` : ''}
              </Text>
              <Text style={styles.choiceDetail}>{categoryName}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  sheet: { flex: 1, paddingHorizontal: 16 },
  choice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.default,
  },
  choiceText: { color: Colors.text.secondary, fontSize: 14 },
  choiceSelected: { color: Colors.type.desirable, fontWeight: '700' },
  choiceDetail: { color: Colors.text.faint, fontSize: 12 },
});
