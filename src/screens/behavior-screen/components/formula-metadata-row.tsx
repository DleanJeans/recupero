import React, { useMemo } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text, TextInput } from '../../../components/text';
import type { MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import {
  type DailyGoalProgress,
  evaluateDecimalInput,
  formatMetadataValueUnit,
  sanitizeDecimalInput,
} from '../../../utils/metadata-calculation-utils';
import {
  evaluateFormula,
  FORMULA_OPERATOR_SYMBOLS,
  getFieldFormula,
  tokenizeStoredFormula,
} from '../../../utils/metadata-formula-utils';
import { formatMetadataDisplayNumber } from '../../../utils/metadata-list-display-utils';
import { metadataInputRowStyles, ProgressIndicator } from './metadata-input-row';

interface Props {
  field: MetadataField;
  fields: MetadataField[];
  values: Record<string, string>;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  typed: boolean;
  onTypedChange: (key: string, typed: boolean) => void;
  onFocus: () => void;
  onBlur: () => void;
  progress?: DailyGoalProgress | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * A field filled by a formula (e.g. Weight = Before - After). Formula mode lays the formula out with an input box
 * for each field it uses, "[350] − [170] = 180 g"; Type mode is a plain input to type the value instead.
 */
export function FormulaMetadataRow({
  field,
  fields,
  values,
  onChange,
  typed,
  onTypedChange,
  onFocus,
  onBlur,
  progress,
  style,
}: Props) {
  const formula = getFieldFormula(field) ?? '';
  const tokens = useMemo(() => tokenizeStoredFormula(formula) ?? [], [formula]);
  const evaluation = useMemo(() => evaluateFormula(formula, values), [formula, values]);
  const unit = formatMetadataValueUnit(field);
  const labelOf = (key: string) => fields.find(item => item.key === key)?.label.trim() || '?';

  const setValue = (key: string, text: string) => onChange(prev => ({ ...prev, [key]: sanitizeDecimalInput(text) }));
  const evaluateValue = (key: string) => {
    onChange(prev => ({ ...prev, [key]: evaluateDecimalInput(prev[key] ?? '') }));
    onBlur();
  };

  const status = (() => {
    if (evaluation.missingKeys.length > 0) {
      const filledAny = evaluation.missingKeys.length < tokens.filter(token => token.type === 'field').length;
      const names = evaluation.missingKeys.map(labelOf).join(', ');
      return { text: filledAny ? `Needs ${names}. You can save now and add it later.` : '', error: false };
    }
    if (evaluation.error === 'negative') {
      // The common case, A - B, gets a plain explanation.
      const [a, op, b] = tokens;
      const simple = tokens.length === 3 && a.type === 'field' && op.type === 'operator' && op.operator === '-';
      return {
        text:
          simple && b.type === 'field'
            ? `${labelOf(b.key)} is more than ${labelOf(a.key)}`
            : 'Below 0, so it is left empty',
        error: true,
      };
    }
    if (evaluation.error === 'divide') return { text: 'Divides by 0', error: true };
    if (evaluation.error) return { text: 'This formula does not work', error: true };
    return { text: '', error: false };
  })();

  return (
    <View style={[styles.metadataFieldRow, !typed && styles.formulaCard, style]}>
      <View style={styles.header}>
        <Text
          style={[styles.metadataFieldLabel, styles.headerLabel]}
          numberOfLines={1}
        >
          {field.label}
          {field.unit ? ` (${field.unit})` : ''}
        </Text>
        <View style={styles.segment}>
          {(['Manual', 'Formula'] as const).map(option => {
            const active = (option === 'Manual') === typed;
            return (
              <Pressable
                key={option}
                onPress={() => onTypedChange(field.key, option === 'Manual')}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={option === 'Manual' ? `Type ${field.label}` : `Work out ${field.label}`}
              >
                <Text
                  style={[styles.segmentText, active && styles.segmentTextActive]}
                  numberOfLines={1}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {typed ? (
        <TextInput
          style={styles.input}
          value={values[field.key] ?? ''}
          onChangeText={text => setValue(field.key, text)}
          onFocus={onFocus}
          onBlur={() => evaluateValue(field.key)}
          placeholder="0"
          placeholderTextColor={Colors.text.dim}
          keyboardType="decimal-pad"
          returnKeyType="done"
          maxLength={8}
        />
      ) : (
        <View style={styles.formulaLine}>
          {tokens.map((token, index) => {
            if (token.type === 'field') {
              return (
                <View
                  // biome-ignore lint/suspicious/noArrayIndexKey: a field can appear twice in a formula
                  key={index}
                  style={styles.termBox}
                >
                  <Text
                    style={styles.termLabel}
                    numberOfLines={1}
                  >
                    {labelOf(token.key)}
                  </Text>
                  <TextInput
                    style={styles.termInput}
                    value={values[token.key] ?? ''}
                    onChangeText={text => setValue(token.key, text)}
                    onFocus={onFocus}
                    onBlur={() => evaluateValue(token.key)}
                    placeholder="0"
                    placeholderTextColor={Colors.text.dim}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    maxLength={8}
                  />
                </View>
              );
            }
            return (
              <Text
                // biome-ignore lint/suspicious/noArrayIndexKey: operators repeat
                key={index}
                style={styles.operator}
              >
                {token.type === 'number' ? token.text : FORMULA_OPERATOR_SYMBOLS[token.operator]}
              </Text>
            );
          })}
          <Text
            style={[styles.result, evaluation.result == null && styles.resultEmpty]}
            numberOfLines={1}
          >
            = {evaluation.result == null ? '–' : `${formatMetadataDisplayNumber(evaluation.result)}${unit}`}
          </Text>
        </View>
      )}
      {!typed && status.text ? (
        <Text style={[styles.status, status.error && styles.statusError]}>{status.text}</Text>
      ) : null}
      {progress && <ProgressIndicator progress={progress} />}
    </View>
  );
}

const styles = StyleSheet.create({
  ...metadataInputRowStyles,
  formulaCard: {
    borderWidth: 1,
    borderColor: Colors.typeBtn.desirable,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLabel: {
    flex: 1,
  },
  segment: {
    flexDirection: 'row',
    flexShrink: 0,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    padding: 2,
  },
  segmentItem: {
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: Colors.bg.elevated,
  },
  segmentText: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: Colors.text.primary,
  },
  input: {
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 16,
  },
  formulaLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    columnGap: 6,
    rowGap: 8,
  },
  termBox: {
    flexGrow: 1,
    flexBasis: 72,
    maxWidth: 120,
    gap: 2,
  },
  termLabel: {
    color: Colors.text.muted,
    fontSize: 10.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  termInput: {
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    color: Colors.text.primary,
    fontSize: 16,
    textAlign: 'center',
  },
  operator: {
    color: Colors.text.light,
    fontSize: 18,
    fontWeight: '600',
    paddingBottom: 9,
  },
  result: {
    flexGrow: 1,
    flexShrink: 0,
    minWidth: 70,
    textAlign: 'right',
    color: Colors.type.desirable,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    paddingBottom: 7,
  },
  resultEmpty: {
    color: Colors.text.faint,
  },
  status: {
    color: Colors.text.muted,
    fontSize: 12,
  },
  statusError: {
    color: Colors.type.undesirable,
  },
});
