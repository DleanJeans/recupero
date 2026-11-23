import React, { useMemo, useRef, useState } from 'react';
import { Pressable, type TextInput as RNTextInput, StyleSheet, View } from 'react-native';
import type { MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import {
  findFormulaUsingField,
  formulaToEditText,
  getFormulaCandidateFields,
  parseFormulaText,
  tokenizeStoredFormula,
} from '../../../utils/metadata-formula-utils';
import { FormulaPreview } from '../../formula-preview';
import { Text, TextInput } from '../../text';

interface Props {
  field: MetadataField;
  fields: MetadataField[];
  index: number;
  onFormulaChange: (index: number, formula: string | undefined) => void;
}

/** Optional formula for a Base or Manual field, typed like Notion: field names become pills, operators stay text. */
export function FormulaEditor({ field, fields, index, onFormulaChange }: Props) {
  const usedBy = findFormulaUsingField(fields, field.key);
  const candidates = useMemo(() => getFormulaCandidateFields(fields, field), [field, fields]);
  const [text, setText] = useState(() => formulaToEditText(field.formula, fields));
  const [focused, setFocused] = useState(false);
  const selectionRef = useRef<{ start: number; end: number } | undefined>(undefined);
  const inputRef = useRef<RNTextInput>(null);
  const parsed = useMemo(() => parseFormulaText(text, candidates), [candidates, text]);
  const savedTokens = useMemo(
    () => (field.formula ? (tokenizeStoredFormula(field.formula) ?? []) : []),
    [field.formula],
  );

  if (usedBy) {
    return (
      <View style={styles.group}>
        <Text style={styles.optionLabel}>Formula</Text>
        <Text style={styles.hint}>Used in {usedBy.label || 'another field'}'s formula, so it can't have one.</Text>
      </View>
    );
  }

  const handleChange = (next: string) => {
    setText(next);
    const result = parseFormulaText(next, candidates);
    if (result.ok && result.formula !== field.formula) onFormulaChange(index, result.formula);
  };

  const insertField = (label: string) => {
    const selection = selectionRef.current ?? { start: text.length, end: text.length };
    const before = text.slice(0, selection.start);
    const after = text.slice(selection.end);
    const spacer = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
    const next = `${before}${spacer}${label}${after.length > 0 && !/^\s/.test(after) ? ' ' : ''}${after}`;
    const cursor = before.length + spacer.length + label.length;
    selectionRef.current = { start: cursor, end: cursor };
    handleChange(next);
    inputRef.current?.focus();
  };

  const showPreview = !focused && savedTokens.length > 0;

  return (
    <View style={styles.group}>
      <Text style={styles.optionLabel}>
        Formula <Text style={styles.optional}>· optional</Text>
      </Text>
      {showPreview ? (
        <Pressable
          style={styles.box}
          onPress={() => inputRef.current?.focus()}
          accessibilityRole="button"
          accessibilityLabel="Edit formula"
        >
          <FormulaPreview
            tokens={savedTokens}
            fields={fields}
            prefix="="
          />
        </Pressable>
      ) : null}
      <TextInput
        ref={inputRef}
        style={[styles.input, showPreview && styles.hiddenInput]}
        value={text}
        onChangeText={handleChange}
        onSelectionChange={event => {
          selectionRef.current = event.nativeEvent.selection;
        }}
        onFocus={() => {
          setFocused(true);
          // Pick up renamed fields: rebuild the text from the saved formula unless a half-typed one is showing.
          if (parsed.ok) setText(formulaToEditText(field.formula, fields));
        }}
        onBlur={() => setFocused(false)}
        placeholder={
          candidates.length >= 2 ? `e.g. ${candidates[0].label} - ${candidates[1].label}` : 'e.g. Before - After'
        }
        placeholderTextColor={Colors.text.faint}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {focused && parsed.ok && parsed.tokens.length > 0 ? (
        <FormulaPreview
          tokens={parsed.tokens}
          fields={fields}
          prefix="="
          style={styles.livePreview}
        />
      ) : null}
      {!parsed.ok && text.trim() ? <Text style={styles.error}>{parsed.error}</Text> : null}
      {focused ? (
        candidates.length > 0 ? (
          <View style={styles.chips}>
            {candidates.map(candidate => (
              <Pressable
                key={candidate.key}
                onPress={() => insertField(candidate.label.trim())}
                style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Add ${candidate.label} to the formula`}
              >
                <Text
                  style={styles.chipText}
                  numberOfLines={1}
                >
                  + {candidate.label.trim() || 'Untitled'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.hint}>Add Manual fields (e.g. Before, After) to use them here.</Text>
        )
      ) : !showPreview ? (
        <Text style={styles.hint}>Type field names with + − × ÷ ( ). Leave empty to type the value each time.</Text>
      ) : (
        <Text style={styles.hint}>Filled when every field in it has a value. You can still type over it.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 6,
  },
  optionLabel: {
    color: Colors.text.muted,
    fontSize: 11,
    fontWeight: '600',
    paddingLeft: 4,
  },
  optional: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '400',
  },
  box: {
    minHeight: 46,
    justifyContent: 'center',
    backgroundColor: Colors.bg.input,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    height: 46,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 15,
    fontWeight: '600',
  },
  /** Kept mounted (so tapping the preview can focus it) but out of sight while the pill preview shows. */
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  livePreview: {
    paddingHorizontal: 4,
  },
  error: {
    color: Colors.type.undesirable,
    fontSize: 12,
    paddingLeft: 4,
  },
  hint: {
    color: Colors.text.faint,
    fontSize: 12,
    lineHeight: 16,
    paddingLeft: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: Colors.bg.elevated,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    color: Colors.type.desirable,
    fontSize: 13,
    fontWeight: '600',
  },
});
