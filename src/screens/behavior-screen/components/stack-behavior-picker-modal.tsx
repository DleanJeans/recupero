import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Text, TextInput } from '../../../components/text';
import { useActiveBehaviors } from '../../../hooks/use-active-behaviors';
import { Colors } from '../../../utils/colors';

interface StackBehaviorPickerModalProps {
  visible: boolean;
  /** Behaviours already in the stack (and the one being logged), left out of the list. */
  excludeIds: string[];
  onClose: () => void;
  onPick: (behaviorId: string) => void;
}

export function StackBehaviorPickerModal({ visible, excludeIds, onClose, onPick }: StackBehaviorPickerModalProps) {
  const behaviors = useActiveBehaviors();
  const [query, setQuery] = useState('');

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return behaviors
      .filter(behavior => !excludeIds.includes(behavior.id))
      .filter(behavior => !q || behavior.name.toLowerCase().includes(q))
      .sort((a, b) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0));
  }, [behaviors, excludeIds, query]);

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
            data={options}
            keyExtractor={behavior => behavior.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
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
            )}
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
