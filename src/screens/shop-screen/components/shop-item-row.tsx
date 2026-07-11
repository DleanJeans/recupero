import { Ionicons } from '@expo/vector-icons';
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
  onEdit: () => void;
  onDelete: () => void;
}

export function ShopItemRow({ item, balance, onBuy, onEdit, onDelete }: ShopItemRowProps) {
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
      <View style={styles.actions}>
        <Button
          variant="icon"
          onPress={onEdit}
          accessibilityLabel={`Edit ${item.name}`}
          style={styles.iconButton}
        >
          <Ionicons
            name="pencil-outline"
            size={18}
            color={Colors.text.muted}
          />
        </Button>
        <Button
          variant="icon"
          onPress={onDelete}
          accessibilityLabel={`Delete ${item.name}`}
          style={styles.iconButton}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={Colors.type.undesirable}
          />
        </Button>
        <Button
          variant={canBuy ? 'primary' : 'secondary'}
          size="sm"
          onPress={onBuy}
          disabled={!canBuy}
        >
          {canBuy ? 'Buy' : 'Not enough'}
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
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
  },
  itemDetails: {
    flex: 1,
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 30,
    height: 34,
    justifyContent: 'center',
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
