import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text, TextInput } from '../../../components/text';
import type { ShopItem } from '../../../types/shop';
import { Colors } from '../../../utils/colors';
import { formatVnd, parseVndInput, sanitizeVndInput } from '../../../utils/money-utils';

interface ShopItemRowProps {
  item: ShopItem;
  balance: number;
  onBuy: () => void;
  onEdit: (name: string, cost: number) => boolean;
  onDelete: () => void;
}

export function ShopItemRow({ item, balance, onBuy, onEdit, onDelete }: ShopItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [cost, setCost] = useState(String(item.cost));
  const canBuy = balance >= item.cost;
  const canSave = name.trim().length > 0 && parseVndInput(cost) > 0;

  const handleStartEditing = () => {
    setName(item.name);
    setCost(String(item.cost));
    setEditing(true);
  };

  const handleSave = () => {
    if (!canSave || !onEdit(name, parseVndInput(cost))) return;
    setEditing(false);
  };

  if (editing) {
    return (
      <View style={styles.row}>
        <TextInput
          style={styles.editNameInput}
          value={name}
          onChangeText={setName}
          placeholder="Reward name"
          placeholderTextColor={Colors.text.faint}
          returnKeyType="next"
          maxLength={80}
        />
        <View style={styles.editActions}>
          <TextInput
            style={styles.editCostInput}
            value={cost}
            onChangeText={value => setCost(sanitizeVndInput(value))}
            placeholder="Cost in ₫"
            placeholderTextColor={Colors.text.faint}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={12}
          />
          <Button
            variant="primary"
            size="sm"
            onPress={handleSave}
            disabled={!canSave}
          >
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setEditing(false)}
          >
            Cancel
          </Button>
        </View>
      </View>
    );
  }

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
          onPress={handleStartEditing}
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
  editNameInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    color: Colors.text.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editCostInput: {
    width: 96,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    color: Colors.text.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'right',
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
