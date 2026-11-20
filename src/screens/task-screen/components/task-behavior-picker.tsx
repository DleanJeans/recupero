import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { FullScreenModal } from '../../../components/full-screen-modal';
import { Text, TextInput } from '../../../components/text';
import type { BehaviorEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';

interface TaskBehaviorPickerProps {
  behaviors: BehaviorEntry[];
  selectedBehaviorId: string | undefined;
  onPick: (behaviorId: string | undefined) => void;
  onClose: () => void;
}

/** Full-screen, searchable list of behaviors to log when the task is ticked. */
export function TaskBehaviorPicker({ behaviors, selectedBehaviorId, onPick, onClose }: TaskBehaviorPickerProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? behaviors.filter(behavior => behavior.name.toLowerCase().includes(q)) : behaviors;
  }, [behaviors, query]);

  return (
    <FullScreenModal
      title="Choose a behavior"
      onClose={onClose}
    >
      <View style={styles.searchWrap}>
        <Ionicons
          name="search-outline"
          size={17}
          color={Colors.text.faint}
        />
        <TextInput
          style={styles.search}
          placeholder="Search behaviors"
          placeholderTextColor={Colors.text.faint}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={behavior => behavior.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}
        renderItem={({ item }) => {
          const selected = item.id === selectedBehaviorId;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => onPick(selected ? undefined : item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <BehaviorIcon
                behavior={item}
                size={26}
              />
              <Text
                style={styles.name}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {selected && (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={Colors.text.primary}
                />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No matching behaviors.</Text>}
      />
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.bg.input,
  },
  search: { flex: 1, color: Colors.text.primary, fontSize: 15, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  name: { flex: 1, color: Colors.text.primary, fontSize: 15 },
  pressed: { opacity: 0.6 },
  empty: { color: Colors.text.muted, textAlign: 'center', paddingVertical: 24 },
});
