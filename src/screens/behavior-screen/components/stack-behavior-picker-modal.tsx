import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Text, TextInput } from '../../../components/text';
import { useActiveBehaviors } from '../../../hooks/use-active-behaviors';
import type { BehaviorEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { rankStackSuggestions, type StackSuggestionGroup } from '../../../utils/stack-suggestion-utils';

const GROUP_LABELS: Record<StackSuggestionGroup, string> = {
  stacked: 'Stacked before',
  category: 'Same category',
  other: 'Other behaviours',
};

type PickerRow = { kind: 'header'; group: StackSuggestionGroup } | { kind: 'behavior'; behavior: BehaviorEntry };

interface StackBehaviorPickerModalProps {
  visible: boolean;
  /** Behaviour being logged. When set, behaviours stacked with it before come first, then ones in its category. */
  behaviorId?: string;
  /** Behaviours already in the stack (and the one being logged), left out of the list. */
  excludeIds: string[];
  onClose: () => void;
  onPick: (behaviorId: string) => void;
}

export function StackBehaviorPickerModal({
  visible,
  behaviorId,
  excludeIds,
  onClose,
  onPick,
}: StackBehaviorPickerModalProps) {
  const behaviors = useActiveBehaviors();
  const [query, setQuery] = useState('');

  const ranked = useMemo(() => {
    if (!visible) return [];
    const current = behaviorId ? behaviors.find(behavior => behavior.id === behaviorId) : undefined;
    return rankStackSuggestions(behaviors, current, excludeIds);
  }, [visible, behaviors, behaviorId, excludeIds]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = ranked.filter(({ behavior }) => !q || behavior.name.toLowerCase().includes(q));
    const showHeaders = matches.some(({ group }) => group !== 'other');
    const result: PickerRow[] = [];
    matches.forEach(({ behavior, group }, index) => {
      if (showHeaders && (index === 0 || matches[index - 1].group !== group)) {
        result.push({ kind: 'header', group });
      }
      result.push({ kind: 'behavior', behavior });
    });
    return result;
  }, [ranked, query]);

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
        />
        <View style={styles.sheet}>
          <TextInput
            style={styles.search}
            placeholder="Search behaviours"
            placeholderTextColor={Colors.text.faint}
            value={query}
            onChangeText={setQuery}
          />
          <FlatList
            data={rows}
            keyExtractor={row => (row.kind === 'header' ? `header:${row.group}` : row.behavior.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: row }) => {
              if (row.kind === 'header') return <Text style={styles.groupLabel}>{GROUP_LABELS[row.group]}</Text>;
              const item = row.behavior;
              return (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  onPress={() => {
                    setQuery('');
                    onPick(item.id);
                  }}
                >
                  <BehaviorIcon
                    behavior={item}
                    size={22}
                  />
                  <Text
                    style={styles.name}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>No behaviours found</Text>}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  search: {
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  groupLabel: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingTop: 10,
    paddingBottom: 2,
    paddingHorizontal: 4,
  },
  name: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 15,
  },
  empty: {
    color: Colors.text.muted,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
