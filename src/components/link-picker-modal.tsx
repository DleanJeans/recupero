import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useKeyboardVisible } from '../hooks/use-keyboard-visible';
import { Colors } from '../utils/colors';
import type { IconValue } from '../utils/icon-utils';
import { AppIcon } from './app-icon';
import { Text, TextInput } from './text';

export interface LinkPickerItem {
  id: string;
  label: string;
  /** Icon value (emoji, mix, image). */
  icon?: IconValue;
  /** Small muted line under the label. */
  hint?: string;
}

interface LinkPickerModalProps {
  placeholder: string;
  emptyText: string;
  items: LinkPickerItem[];
  fallbackIcon: string;
  selectedId?: string;
  onClose: () => void;
  onPick: (id: string) => void;
  /** When set and nothing matches the search exactly, a "Create" row makes a new item and returns its id. */
  onCreate?: (name: string) => string | undefined;
}

/** Search-and-pick dialog for task and person links. Docks to the top while the keyboard shows. */
export function LinkPickerModal({
  placeholder,
  emptyText,
  items,
  fallbackIcon,
  selectedId,
  onClose,
  onPick,
  onCreate,
}: LinkPickerModalProps) {
  const keyboardUp = useKeyboardVisible();
  const [query, setQuery] = useState('');
  const trimmed = query.trim();

  const rows = useMemo(() => {
    const q = trimmed.toLowerCase();
    return q ? items.filter(item => item.label.toLowerCase().includes(q)) : items;
  }, [items, trimmed]);

  const canCreate =
    onCreate != null &&
    trimmed.length > 0 &&
    !items.some(item => item.label.trim().toLowerCase() === trimmed.toLowerCase());

  const handleCreate = () => {
    const id = onCreate?.(trimmed);
    if (id) onPick(id);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, keyboardUp && styles.overlayTop]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View style={styles.sheet}>
          <TextInput
            style={styles.search}
            placeholder={placeholder}
            placeholderTextColor={Colors.text.faint}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <FlatList
            data={rows}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              canCreate ? (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  onPress={handleCreate}
                  accessibilityRole="button"
                >
                  <View style={styles.createIcon}>
                    <Ionicons
                      name="add"
                      size={18}
                      color={Colors.bg.black}
                    />
                  </View>
                  <Text
                    style={styles.createText}
                    numberOfLines={1}
                  >
                    {`Create "${trimmed}"`}
                  </Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={canCreate ? null : <Text style={styles.empty}>{emptyText}</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => onPick(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: item.id === selectedId }}
              >
                <View style={styles.iconBox}>
                  <AppIcon
                    value={item.icon ?? ''}
                    size={22}
                    fallback={fallbackIcon}
                  />
                </View>
                <View style={styles.labels}>
                  <Text
                    style={styles.name}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {item.hint ? (
                    <Text
                      style={styles.hint}
                      numberOfLines={1}
                    >
                      {item.hint}
                    </Text>
                  ) : null}
                </View>
                {item.id === selectedId ? (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={Colors.type.desirable}
                  />
                ) : null}
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayTop: { justifyContent: 'flex-start' },
  sheet: { maxHeight: '80%', backgroundColor: Colors.bg.card, borderRadius: 12, padding: 12, gap: 8 },
  search: {
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  pressed: { opacity: 0.6 },
  iconBox: { width: 28, alignItems: 'center' },
  labels: { flex: 1, minWidth: 0 },
  name: { color: Colors.text.primary, fontSize: 15 },
  hint: { color: Colors.text.muted, fontSize: 12 },
  createIcon: {
    width: 22,
    height: 22,
    marginHorizontal: 3,
    borderRadius: 6,
    backgroundColor: Colors.type.desirable,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: { flex: 1, color: Colors.type.desirable, fontSize: 15, fontWeight: '600' },
  empty: { color: Colors.text.muted, textAlign: 'center', paddingVertical: 24 },
});
