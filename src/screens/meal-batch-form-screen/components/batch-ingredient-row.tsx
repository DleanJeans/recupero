import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppIcon } from '../../../components/app-icon';
import { Button } from '../../../components/button';
import { Text, TextInput } from '../../../components/text';
import { Colors } from '../../../utils/colors';

interface BatchIngredientRowProps {
  name: string;
  icon?: React.ComponentProps<typeof AppIcon>['value'];
  /** Short line under the name, e.g. what this ingredient adds or why it adds nothing. */
  subtitle: string;
  warn?: boolean;
  amountText: string;
  unit: string;
  onChangeAmount: (text: string) => void;
  onRemove: () => void;
}

export function BatchIngredientRow({
  name,
  icon,
  subtitle,
  warn = false,
  amountText,
  unit,
  onChangeAmount,
  onRemove,
}: BatchIngredientRowProps) {
  return (
    <View style={styles.row}>
      <AppIcon
        value={icon}
        size={30}
        fallback="🍽️"
      />
      <View style={styles.text}>
        <Text
          style={styles.name}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          style={[styles.subtitle, warn && styles.warn]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
      <View style={styles.amountBox}>
        <TextInput
          style={styles.amount}
          value={amountText}
          onChangeText={onChangeAmount}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={Colors.text.faint}
          selectTextOnFocus
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      <Button
        variant="icon"
        onPress={onRemove}
        accessibilityLabel={`Remove ${name}`}
      >
        <Ionicons
          name="close"
          size={20}
          color={Colors.text.muted}
        />
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 4,
    marginBottom: 6,
  },
  text: { flex: 1, minWidth: 0 },
  name: { color: Colors.text.primary, fontSize: 14, fontWeight: '600' },
  subtitle: { color: Colors.text.muted, fontSize: 11, marginTop: 1 },
  warn: { color: Colors.cooldown.yellow },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  amount: {
    minWidth: 48,
    height: 38,
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    padding: 0,
  },
  unit: { color: Colors.text.muted, fontSize: 12 },
});
