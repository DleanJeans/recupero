import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import type { CueTriggerRule } from '../../../types/cue';
import { Colors } from '../../../utils/colors';

interface CueTriggerRuleCardProps {
  rule: CueTriggerRule;
  sourceName: string;
  targetName: string;
  onToggle: () => void;
  onRemove: () => void;
}

export function CueTriggerRuleCard({ rule, sourceName, targetName, onToggle, onRemove }: CueTriggerRuleCardProps) {
  return (
    <View style={[styles.card, !rule.enabled && styles.cardDisabled]}>
      <Pressable
        style={styles.toggle}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={rule.enabled ? 'Disable trigger' : 'Enable trigger'}
      >
        <Ionicons
          name={rule.enabled ? 'notifications' : 'notifications-off-outline'}
          size={18}
          color={rule.enabled ? Colors.text.primary : Colors.text.faint}
        />
      </Pressable>
      <View style={styles.body}>
        <Text
          style={styles.title}
          numberOfLines={1}
        >
          {sourceName}
        </Text>
        <Text style={styles.subtitle}>
          {rule.delayMinutes} min later {'->'} {targetName}
        </Text>
      </View>
      <Button
        variant="icon"
        onPress={onRemove}
        accessibilityLabel="Remove trigger"
        style={styles.removeButton}
      >
        <Ionicons
          name="trash-outline"
          size={19}
          color={Colors.text.faint}
        />
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  toggle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.elevated,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.text.light,
    fontSize: 13,
  },
  removeButton: {
    width: 34,
    height: 34,
  },
});
