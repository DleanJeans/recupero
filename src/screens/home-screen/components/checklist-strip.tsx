import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from '../../../components/text';
import { useChecklistsStore } from '../../../store/checklists-store';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { ChecklistStripCard } from './checklist-strip-card';

/** Row of checklist cards above the category chips on Routines, ending with + New. */
export function ChecklistStrip() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const checklists = useChecklistsStore(state => state.checklists);
  const empty = checklists.length === 0;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {checklists.map(checklist => (
        <ChecklistStripCard
          key={checklist.id}
          checklist={checklist}
        />
      ))}
      <Pressable
        style={({ pressed }) => [styles.add, empty && styles.addEmpty, pressed && styles.pressed]}
        onPress={() => navigation.navigate('ChecklistForm', {})}
        accessibilityRole="button"
        accessibilityLabel="New checklist"
      >
        <Ionicons
          name="add"
          size={18}
          color={Colors.text.muted}
        />
        <Text style={styles.addLabel}>{empty ? 'New checklist' : 'New'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 10,
  },
  content: {
    paddingHorizontal: 16,
    gap: 8,
  },
  add: {
    minWidth: 72,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addEmpty: {
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.6,
  },
  addLabel: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
});
