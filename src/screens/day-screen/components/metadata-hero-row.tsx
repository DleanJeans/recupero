import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { DailyMetadataTotal } from '../../../utils/behavior-utils';
import { Colors } from '../../../utils/colors';

interface MetadataHeroRowProps {
  item: DailyMetadataTotal;
}

export function MetadataHeroRow({ item }: MetadataHeroRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{item.label}</Text>
      <View style={styles.valueRow}>
        <Text
          selectable
          style={styles.value}
        >
          {item.value}
        </Text>
        {item.unit ? <Text style={styles.unit}>{item.unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: {
    color: Colors.text.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  value: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
  },
});
