import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { roundTo2 } from '../../../utils/number-utils';

interface BatchTotalsCardProps {
  fields: MetadataField[];
  totals: Record<string, number>;
  rates: Record<string, number>;
  portion: Record<string, number>;
  rateBasisLabel: string;
  portionLabel?: string;
}

/** Totals of the whole batch, per rate basis (e.g. per 100 g) and for one planned portion. */
export function BatchTotalsCard({
  fields,
  totals,
  rates,
  portion,
  rateBasisLabel,
  portionLabel,
}: BatchTotalsCardProps) {
  const shown = fields.filter(field => totals[field.key] != null);
  if (shown.length === 0) return null;
  const withPortion = portionLabel != null;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={[styles.cell, styles.label]} />
        <Text style={[styles.cell, styles.head]}>Whole batch</Text>
        <Text style={[styles.cell, styles.head]}>{rateBasisLabel}</Text>
        {withPortion && <Text style={[styles.cell, styles.head]}>{portionLabel}</Text>}
      </View>
      {shown.map(field => (
        <View
          key={field.key}
          style={styles.row}
        >
          <Text
            style={[styles.cell, styles.label]}
            numberOfLines={1}
          >
            {field.label}
            {field.unit ? ` (${field.unit})` : ''}
          </Text>
          <Text style={styles.cell}>{roundTo2(totals[field.key])}</Text>
          <Text style={[styles.cell, styles.strong]}>{roundTo2(rates[field.key] ?? 0)}</Text>
          {withPortion && <Text style={styles.cell}>{roundTo2(portion[field.key] ?? 0)}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#14201a',
    borderColor: '#24382d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { flex: 1, color: Colors.text.secondary, fontSize: 12, textAlign: 'right' },
  label: { flex: 1.3, textAlign: 'left', color: Colors.text.light },
  head: { color: Colors.text.muted, fontSize: 10, fontWeight: '700' },
  strong: { color: '#4ade80', fontWeight: '700' },
});
