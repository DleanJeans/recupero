import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import type { SummaryItem } from '../../components/summary-row';

interface DayStatsStripProps {
  items: SummaryItem[];
}

export function DayStatsStrip({ items }: DayStatsStripProps) {
  return (
    <View style={styles.container}>
      {items.map(item => (
        <View
          key={item.label}
          style={styles.stat}
          accessible={item.accessibilityLabel != null}
          accessibilityLabel={item.accessibilityLabel}
        >
          {item.icon === 'star' ? (
            <View style={styles.valueRow}>
              <Ionicons
                name="star"
                size={19}
                color={Colors.star.filled}
              />
              <Text
                selectable
                style={styles.value}
              >
                {item.value}
              </Text>
            </View>
          ) : (
            <Text
              selectable
              style={styles.value}
            >
              {item.value}
            </Text>
          )}
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 10,
    paddingHorizontal: 6,
    paddingVertical: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    minWidth: 54,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    color: Colors.text.primary,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  label: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
});
