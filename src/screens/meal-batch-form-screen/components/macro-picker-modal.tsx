import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from '../../../components/text';
import type { MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';

interface MacroPickerModalProps {
  visible: boolean;
  fields: MetadataField[];
  selectedKey?: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

/** Dropdown-style list for choosing which macro the ingredient rows show. */
export function MacroPickerModal({ visible, fields, selectedKey, onSelect, onClose }: MacroPickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Close"
      >
        <Pressable style={styles.menu}>
          <ScrollView>
            {fields.map(field => {
              const selected = field.key === selectedKey;
              return (
                <Pressable
                  key={field.key}
                  style={styles.option}
                  onPress={() => onSelect(field.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[styles.label, selected && styles.selected]}
                    numberOfLines={1}
                  >
                    {field.unit ? `${field.label} (${field.unit})` : field.label}
                  </Text>
                  {selected && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color="#4ade80"
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 32 },
  menu: {
    maxHeight: '60%',
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingVertical: 6,
  },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 14 },
  label: { color: Colors.text.primary, fontSize: 15, flexShrink: 1 },
  selected: { color: '#4ade80', fontWeight: '700' },
});
