import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { EmojiPicker } from '../../../components/emoji-picker';
import { Text, TextInput } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useNeedsStore } from '../../../store/needs-store';
import type { NeedId } from '../../../types/need';
import { Colors } from '../../../utils/colors';
import { toPlainEmoji } from '../../../utils/icon-utils';
import { parseDecimalInput } from '../../../utils/metadata-calculation-utils';
import {
  DEFAULT_BODY_WORDS,
  findMetadataField,
  formatEmptyHours,
  getBuiltInEmoji,
  getNeedMetadataSource,
  getSharedUnit,
  getSourceFieldKeys,
  NEED_INFO,
} from '../../../utils/need-utils';

interface NeedSettingsRowProps {
  needId: NeedId;
  first: boolean;
  onPickSource: () => void;
  /** Set for needs you made: opens the editor. */
  onEdit?: () => void;
}

export function NeedSettingsRow({ needId, first, onPickSource, onEdit }: NeedSettingsRowProps) {
  const config = useNeedsStore(state => state.needs[needId]);
  const setEnabled = useNeedsStore(state => state.setEnabled);
  const setMetadataSource = useNeedsStore(state => state.setMetadataSource);
  const setBodyWords = useNeedsStore(state => state.setBodyWords);
  const resetLearning = useNeedsStore(state => state.resetLearning);
  const categories = useBehaviorStore(state => state.categories);
  const setBuiltInEmoji = useNeedsStore(state => state.setBuiltInEmoji);
  useNeedsStore(state => state.emojiOverrides[needId]);
  const info = NEED_INFO[needId];
  const builtInEmoji = getBuiltInEmoji(needId);
  const source = getNeedMetadataSource(needId, config, categories);
  const fields = source ? getSourceFieldKeys(source).flatMap(key => findMetadataField(categories, key) ?? []) : [];
  const unit = getSharedUnit(fields);
  const filterNames = (config.metadataSource?.categoryFilter ?? []).flatMap(
    id => categories.find(category => category.id === id)?.name ?? [],
  );
  const [fullText, setFullText] = useState<string>();
  const [wordsText, setWordsText] = useState<string>();
  const [editingWords, setEditingWords] = useState(false);
  const commitWords = () => {
    if (wordsText == null) return;
    const trimmed = wordsText.trim();
    setBodyWords(needId, trimmed === (DEFAULT_BODY_WORDS[needId] ?? '') ? undefined : trimmed);
    setWordsText(undefined);
    setEditingWords(false);
  };
  const words = config.bodyWords ?? DEFAULT_BODY_WORDS[needId] ?? '';

  const updateCustomNeed = useNeedsStore(state => state.updateCustomNeed);
  const changeEmoji = (next: string) => {
    const emoji = toPlainEmoji(next);
    if (!emoji) return;
    if (builtInEmoji) setBuiltInEmoji(needId, emoji === builtInEmoji ? '' : emoji);
    else updateCustomNeed(needId, { emoji });
  };

  const commitFull = () => {
    if (fullText == null || !source) return;
    const parsed = parseDecimalInput(fullText);
    if (parsed != null && parsed > 0)
      setMetadataSource(needId, {
        ...config.metadataSource,
        fieldKey: source.fieldKey,
        fieldKeys: source.fieldKeys,
        fullAmount: parsed,
      });
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
        <EmojiPicker
          value={info.emoji}
          onChangeText={changeEmoji}
          style={styles.iconBox}
        />
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
            <Text
              style={styles.detailLabel}
              numberOfLines={1}
            >
              Fills from metadata
            </Text>
            <Text
              style={[styles.detailValue, styles.detailValueShrink]}
              numberOfLines={1}
            >
              {fields.length > 0
                ? `${fields.map(field => field.label).join(' + ')}${config.metadataSource === undefined ? ' (auto)' : ''}`
                : 'None'}{' '}
              ›
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.detailRow, pressed && styles.pressed]}
            onPress={onPickSource}
            accessibilityRole="button"
          >
            <Text
              style={styles.detailLabel}
              numberOfLines={1}
            >
              From categories
            </Text>
            <Text
              style={[styles.detailValue, styles.detailValueShrink]}
              numberOfLines={1}
            >
              {filterNames.length > 0 ? filterNames.join(', ') : 'All'} ›
            </Text>
          </Pressable>
          {source && fields.length > 0 ? (
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
                {unit ? (
                  <Text
                    style={styles.unit}
                    numberOfLines={1}
                  >
                    {unit}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
          <View style={styles.wordsBlock}>
            <View style={styles.wordsHeader}>
              <Text
                style={styles.detailLabel}
                numberOfLines={1}
              >
                Body words that lower it
              </Text>
              {!editingWords && (
                <Pressable
                  onPress={() => setEditingWords(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Edit body words"
                >
                  <Text
                    style={styles.detailValue}
                    numberOfLines={1}
                  >
                    {words ? 'Edit' : 'Add'}
                  </Text>
                </Pressable>
              )}
            </View>
            {editingWords ? (
              <TextInput
                style={styles.wordsInput}
                value={wordsText ?? words}
                onChangeText={setWordsText}
                onBlur={commitWords}
                onSubmitEditing={commitWords}
                placeholder="e.g. itch, sweat (comma separated)"
                placeholderTextColor={Colors.text.faint}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            ) : words ? (
              <Text style={styles.wordsValue}>{words}</Text>
            ) : null}
          </View>
          {builtInEmoji && info.emoji !== builtInEmoji ? (
            <Pressable
              style={({ pressed }) => [styles.detailRow, pressed && styles.pressed]}
              onPress={() => setBuiltInEmoji(needId, '')}
              accessibilityRole="button"
            >
              <Text style={styles.detailLabel}>Icon: back to {builtInEmoji}</Text>
              <Text style={styles.detailValue}>Reset</Text>
            </Pressable>
          ) : null}
          {onEdit ? (
            <Pressable
              style={({ pressed }) => [styles.detailRow, pressed && styles.pressed]}
              onPress={onEdit}
              accessibilityRole="button"
            >
              <Text style={styles.detailLabel}>Name, icon, decay time, delete</Text>
              <Text style={styles.detailValue}>Edit ›</Text>
            </Pressable>
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
  detailLabel: { color: Colors.text.muted, fontSize: 13, flexShrink: 0, marginRight: 12 },
  detailValue: { color: Colors.text.light, fontSize: 13, fontWeight: '600' },
  wordsBlock: { gap: 4, paddingVertical: 4 },
  wordsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordsValue: { color: Colors.text.light, fontSize: 13 },
  wordsInput: {
    color: Colors.text.light,
    fontSize: 13,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  detailValueShrink: { flexShrink: 1, textAlign: 'right' },
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
  iconBox: { width: 32, height: 32, borderRadius: 8 },
  unit: { color: Colors.text.faint, fontSize: 12 },
});
