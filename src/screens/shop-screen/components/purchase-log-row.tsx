import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import type { ShopPurchase } from '../../../types/shop';
import { Colors } from '../../../utils/colors';
import { formatVnd } from '../../../utils/money-utils';
import { formatCompactDate, formatTime } from '../../../utils/time-utils';

interface PurchaseLogRowProps {
  purchase: ShopPurchase;
  onUndo: () => void;
}

export function PurchaseLogRow({ purchase, onUndo }: PurchaseLogRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.details}>
        <Text
          selectable
          style={styles.name}
        >
          {purchase.itemName}
        </Text>
        <Text style={styles.date}>
          {formatCompactDate(purchase.purchasedAt)} · {formatTime(purchase.purchasedAt)}
        </Text>
      </View>
      <View style={styles.actions}>
        <Text
          selectable
          style={styles.cost}
        >
          -{formatVnd(purchase.cost)}
        </Text>
        <Button
          variant="ghost"
          size="sm"
          onPress={onUndo}
        >
          Undo
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  details: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  date: {
    color: Colors.text.faint,
    fontSize: 12,
  },
  cost: {
    color: Colors.type.undesirable,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    alignItems: 'flex-end',
    gap: 4,
  },
});
