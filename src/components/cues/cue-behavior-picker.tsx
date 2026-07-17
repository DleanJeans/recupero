import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../../store/behavior-store';
import { Colors } from '../../utils/colors';
import { BehaviorIcon } from '../behavior-icon';
import { Text } from '../text';

interface CueBehaviorPickerProps {
  selectedIds: string[];
  multiple?: boolean;
  emptyMessage?: string;
  onChange: (behaviorIds: string[]) => void;
}

export function CueBehaviorPicker({
  selectedIds,
  multiple = true,
  emptyMessage = 'Create a behaviour first.',
  onChange,
}: CueBehaviorPickerProps) {
  const behaviors = useBehaviorStore(state => state.behaviors);

  if (behaviors.length === 0) return <Text style={styles.empty}>{emptyMessage}</Text>;

  return (
    <View style={styles.list}>
      {behaviors.map(behavior => {
        const selected = selectedIds.includes(behavior.id);
        return (
          <Pressable
            key={behavior.id}
            style={({ pressed }) => [styles.row, selected && styles.selectedRow, pressed && styles.pressed]}
            onPress={() => {
              if (!multiple) {
                onChange(selected ? [] : [behavior.id]);
                return;
              }
              onChange(selected ? selectedIds.filter(id => id !== behavior.id) : [...selectedIds, behavior.id]);
            }}
          >
            <BehaviorIcon
              behavior={behavior}
              size={22}
            />
            <Text
              style={[styles.name, selected && styles.selectedName]}
              numberOfLines={1}
            >
              {behavior.name}
            </Text>
            <Ionicons
              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={selected ? Colors.type.desirable : Colors.text.dim}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 7 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 46,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.bg.input,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  selectedRow: { backgroundColor: Colors.bg.elevated, borderColor: Colors.type.desirable },
  name: { flex: 1, color: Colors.text.secondary, fontSize: 14, fontWeight: '600' },
  selectedName: { color: Colors.text.primary },
  empty: { color: Colors.text.faint, fontSize: 13, paddingVertical: 8 },
  pressed: { opacity: 0.72 },
});
