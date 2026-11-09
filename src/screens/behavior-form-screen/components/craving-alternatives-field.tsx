import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useActiveBehaviors } from '../../../hooks/use-active-behaviors';
import { Colors } from '../../../utils/colors';
import { iconText } from '../../../utils/icon-utils';
import { StackBehaviorPickerModal } from '../../behavior-screen/components/stack-behavior-picker-modal';

interface CravingAlternativesFieldProps {
  behaviorId: string;
  value: string[];
  onChange: (ids: string[]) => void;
}

/** "Instead, try…": behaviours suggested first when riding out a craving for this one. */
export function CravingAlternativesField({ behaviorId, value, onChange }: CravingAlternativesFieldProps) {
  const behaviors = useActiveBehaviors();
  const [picking, setPicking] = useState(false);
  const picked = value
    .map(id => behaviors.find(behavior => behavior.id === id))
    .filter((behavior): behavior is NonNullable<typeof behavior> => behavior != null);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Instead, try…</Text>
      <Text style={styles.hint}>Shown first when you ride out a craving for this.</Text>
      <View style={styles.pills}>
        {picked.map(behavior => (
          <Pressable
            key={behavior.id}
            style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
            onPress={() => onChange(value.filter(id => id !== behavior.id))}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${behavior.name}`}
          >
            <Text
              style={styles.pillText}
              numberOfLines={1}
            >
              {iconText(behavior.icon) ? `${iconText(behavior.icon)} ` : ''}
              {behavior.name}
            </Text>
            <Ionicons
              name="close"
              size={14}
              color={Colors.typeText.desirable}
            />
          </Pressable>
        ))}
        <Pressable
          style={({ pressed }) => [styles.pill, styles.addPill, pressed && styles.pressed]}
          onPress={() => setPicking(true)}
          accessibilityRole="button"
        >
          <Ionicons
            name="add"
            size={14}
            color={Colors.text.light}
          />
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>
      <StackBehaviorPickerModal
        visible={picking}
        excludeIds={[behaviorId, ...value]}
        onClose={() => setPicking(false)}
        onPick={id => {
          onChange([...value, id]);
          setPicking(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 14,
  },
  title: { color: Colors.text.primary, fontSize: 16, fontWeight: '600' },
  hint: { color: Colors.text.muted, fontSize: 13 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: Colors.typeBtn.desirable,
  },
  addPill: { backgroundColor: Colors.bg.input },
  pressed: { opacity: 0.75 },
  pillText: { color: Colors.typeText.desirable, fontSize: 14, flexShrink: 1 },
  addText: { color: Colors.text.light, fontSize: 14 },
});
