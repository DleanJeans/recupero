import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{NEED_INFO[needId].label} fills from</Text>
          <ScrollView>
            <Pressable
              style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
              onPress={() => choose(null)}
            >
              <Text style={[styles.choiceText, !current && styles.choiceSelected]}>
                None (only behaviours you pick)
              </Text>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  overlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { maxHeight: '70%', backgroundColor: Colors.bg.card, borderRadius: 14, padding: 16, gap: 10 },
  sheetTitle: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
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
