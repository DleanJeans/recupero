import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useNeedsStore } from '../../../store/needs-store';
import type { NeedId } from '../../../types/need';
import { Colors } from '../../../utils/colors';
import { parseDecimalInput } from '../../../utils/metadata-calculation-utils';
import { findMetadataField, formatEmptyHours, getNeedMetadataSource, NEED_INFO } from '../../../utils/need-utils';

interface NeedSettingsRowProps {
  needId: NeedId;
  first: boolean;
  onPickSource: () => void;
}

export function NeedSettingsRow({ needId, first, onPickSource }: NeedSettingsRowProps) {
  const config = useNeedsStore(state => state.needs[needId]);
  const setEnabled = useNeedsStore(state => state.setEnabled);
  const setMetadataSource = useNeedsStore(state => state.setMetadataSource);
  const resetLearning = useNeedsStore(state => state.resetLearning);
  const categories = useBehaviorStore(state => state.categories);
  const info = NEED_INFO[needId];
  const source = getNeedMetadataSource(needId, config, categories);
  const field = source ? findMetadataField(categories, source.fieldKey) : undefined;
  const [fullText, setFullText] = useState<string>();

  const commitFull = () => {
    if (fullText == null || !source) return;
    const parsed = parseDecimalInput(fullText);
    if (parsed != null && parsed > 0) setMetadataSource(needId, { fieldKey: source.fieldKey, fullAmount: parsed });
    setFullText(undefined);
  };

  return (
    <View style={[styles.need, !first && styles.divider]}>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        onPress={() => setEnabled(needId, !config.enabled)}
        accessibilityRole="switch"
        accessibilityState={{ checked: config.enabled }}
      >
        <Text style={styles.emoji}>{info.emoji}</Text>
        <View style={styles.labels}>
          <Text style={styles.label}>{info.label}</Text>
          <Text style={styles.hint}>
            Full to empty in ~{formatEmptyHours(config.emptyHours)}
            {config.learnedFrom > 0 ? ` · learned from ${config.learnedFrom}` : ' · default'}
          </Text>
        </View>
        <View style={[styles.toggle, config.enabled && styles.toggleOn]}>
          <View style={[styles.thumb, config.enabled && styles.thumbOn]} />
        </View>
      </Pressable>

      {config.enabled && (
        <View style={styles.details}>
          <Pressable
            style={({ pressed }) => [styles.detailRow, pressed && styles.pressed]}
            onPress={onPickSource}
            accessibilityRole="button"
          >
            <Text style={styles.detailLabel}>Fills from metadata</Text>
            <Text style={styles.detailValue}>
              {field ? `${field.label}${config.metadataSource === undefined ? ' (auto)' : ''}` : 'None'} ›
            </Text>
          </Pressable>
          {source && field ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount for 0 → 100%</Text>
              <View style={styles.amount}>
                <TextInput
                  style={styles.input}
                  value={fullText ?? String(source.fullAmount)}
                  onChangeText={setFullText}
                  onBlur={commitFull}
                  onSubmitEditing={commitFull}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                {field.unit ? <Text style={styles.unit}>{field.unit}</Text> : null}
              </View>
            </View>
          ) : null}
          {config.learnedFrom > 0 ? (
            <Pressable
              style={({ pressed }) => [styles.detailRow, pressed && styles.pressed]}
              onPress={() => resetLearning(needId)}
              accessibilityRole="button"
            >
              <Text style={styles.detailLabel}>Reset learned rate</Text>
              <Text style={styles.detailValue}>Reset</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  need: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border.default,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.7 },
  emoji: { fontSize: 18, width: 24, textAlign: 'center' },
  labels: { flex: 1, gap: 2 },
  label: { color: Colors.text.secondary, fontSize: 15 },
  hint: { color: Colors.text.faint, fontSize: 12 },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.bg.elevated,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: Colors.status.success },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.text.muted },
  thumbOn: { backgroundColor: Colors.text.primary, alignSelf: 'flex-end' },
  details: { marginLeft: 34, gap: 2 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  detailLabel: { color: Colors.text.muted, fontSize: 13 },
  detailValue: { color: Colors.text.light, fontSize: 13, fontWeight: '600' },
  amount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    minWidth: 64,
    textAlign: 'right',
    color: Colors.text.primary,
    backgroundColor: Colors.bg.input,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
  },
  unit: { color: Colors.text.faint, fontSize: 12 },
});
