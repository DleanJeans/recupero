import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../components/text';
import { Colors } from '../../utils/colors';

export interface SummaryItem {
  label: string;
  value: string | number;
  icon?: 'star';
  accessibilityLabel?: string;
}

interface SummaryRowProps {
  items: SummaryItem[];
}

export function SummaryRow({ items }: SummaryRowProps) {
  return (
    <View style={styles.summaryRow}>
      {items.map(item => (
        <View
          key={item.label}
          style={styles.summaryItem}
          accessible={item.accessibilityLabel != null}
          accessibilityLabel={item.accessibilityLabel}
        >
          {item.icon === 'star' ? (
            <View style={styles.starSummaryValue}>
              <Ionicons
                name="star"
                size={18}
                color={Colors.star.filled}
              />
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ) : (
            <Text style={styles.summaryValue}>{item.value}</Text>
          )}
          <Text style={styles.summaryLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.bg.card,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 12,
    paddingVertical: 14,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 54,
  },
  summaryValue: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  starSummaryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
