import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import type { ShopItem } from '../../../types/shop';
import { Colors } from '../../../utils/colors';
import { formatVnd } from '../../../utils/money-utils';

interface ShopItemRowProps {
  item: ShopItem;
  balance: number;
  onBuy: () => void;
}

export function ShopItemRow({ item, balance, onBuy }: ShopItemRowProps) {
  const canBuy = balance >= item.cost;

  return (
    <View style={styles.row}>
      <View style={styles.itemDetails}>
        <Text
          selectable
          style={styles.name}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          selectable
          style={styles.cost}
        >
          {formatVnd(item.cost)}
        </Text>
      </View>
      <Button
        variant={canBuy ? 'primary' : 'secondary'}
        size="sm"
        onPress={onBuy}
        disabled={!canBuy}
      >
        {canBuy ? 'Buy' : 'Not enough'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
  },
  itemDetails: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  cost: {
    color: Colors.type.desirable,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
