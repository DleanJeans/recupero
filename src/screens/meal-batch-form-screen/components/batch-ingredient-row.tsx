import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
  /** Starts a timer on the ingredient (e.g. chopping or marinating time). */
  onStartTimer?: () => void;
  /** Press and hold on the icon or name: opens the ingredient's Behavior Details. */
  onOpenDetails?: () => void;
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
  onStartTimer,
  onOpenDetails,
}: BatchIngredientRowProps) {
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.details}
        onLongPress={onOpenDetails}
        accessibilityRole="button"
        accessibilityLabel={`${name}, hold to open details`}
      >
        <AppIcon
          value={icon}
          size={30}
          fallback="🍽️"
        />
        <View style={styles.text}>
          <Text
            style={styles.name}
            numberOfLines={2}
          >
            {name}
          </Text>
          <Text
            style={[styles.subtitle, warn && styles.warn]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>
      </Pressable>
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
      {onStartTimer && (
        <Button
          variant="icon"
          style={styles.tightButton}
          onPress={onStartTimer}
          accessibilityLabel={`Start timer for ${name}`}
        >
          <Ionicons
            name="play-circle-outline"
            size={24}
            color={Colors.text.muted}
          />
        </Button>
      )}
      <Button
        variant="icon"
        style={styles.tightButton}
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
    gap: 8,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 2,
    marginBottom: 6,
  },
  details: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  text: { flex: 1, minWidth: 0 },
  name: { color: Colors.text.primary, fontSize: 14, fontWeight: '600' },
  subtitle: { color: Colors.text.muted, fontSize: 11, marginTop: 1 },
  tightButton: { minWidth: 32, paddingHorizontal: 2 },
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
    minWidth: 44,
    height: 38,
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    padding: 0,
  },
  unit: { color: Colors.text.muted, fontSize: 12 },
});
