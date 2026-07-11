import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text, TextInput } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { parseVndInput } from '../../../utils/money-utils';

interface AddShopItemFormProps {
  name: string;
  cost: string;
  onNameChange: (value: string) => void;
  onCostChange: (value: string) => void;
  onAdd: () => void;
}

export function AddShopItemForm({ name, cost, onNameChange, onCostChange, onAdd }: AddShopItemFormProps) {
  const canAdd = name.trim().length > 0 && parseVndInput(cost) > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>Add item</Text>
      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={onNameChange}
        placeholder="e.g. Movie night"
        placeholderTextColor={Colors.text.faint}
        returnKeyType="next"
        maxLength={80}
      />
      <View style={styles.bottomRow}>
        <TextInput
          style={styles.costInput}
          value={cost}
          onChangeText={onCostChange}
          placeholder="Price in ₫"
          placeholderTextColor={Colors.text.faint}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={12}
        />
        <Button
          variant="primary"
          onPress={onAdd}
          disabled={!canAdd}
          style={styles.addButton}
        >
          Add item
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
  },
  sectionLabel: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  nameInput: {
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    color: Colors.text.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
  },
  costInput: {
    flex: 1,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    color: Colors.text.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButton: {
    justifyContent: 'center',
  },
});
