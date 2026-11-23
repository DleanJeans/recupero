import React from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import type { MetadataField } from '../types/behavior';
import { Colors } from '../utils/colors';
import { FORMULA_OPERATOR_SYMBOLS, type FormulaToken } from '../utils/metadata-formula-utils';
import { Text } from './text';

interface Props {
  tokens: FormulaToken[];
  fields: MetadataField[];
  /** Shown before the formula, e.g. "=". */
  prefix?: string;
  style?: StyleProp<ViewStyle>;
}

/** A formula the way Notion shows one: fields as pills, numbers and operators as plain text. */
export function FormulaPreview({ tokens, fields, prefix, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
      {tokens.map((token, index) => {
        if (token.type === 'field') {
          const label = fields.find(field => field.key === token.key)?.label.trim() || '?';
          return (
            <Text
              // biome-ignore lint/suspicious/noArrayIndexKey: tokens have no id and the same field can repeat
              key={index}
              style={styles.pill}
              numberOfLines={1}
            >
              {label}
            </Text>
          );
        }
        return (
          <Text
            // biome-ignore lint/suspicious/noArrayIndexKey: tokens have no id and operators repeat
            key={index}
            style={styles.operator}
          >
            {token.type === 'number' ? token.text : FORMULA_OPERATOR_SYMBOLS[token.operator]}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
  },
  prefix: {
    color: Colors.type.desirable,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 2,
  },
  pill: {
    color: Colors.text.primary,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 7,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 13,
    fontWeight: '600',
  },
  operator: {
    color: Colors.text.light,
    fontSize: 15,
    fontWeight: '600',
  },
});
