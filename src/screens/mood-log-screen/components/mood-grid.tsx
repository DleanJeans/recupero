import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppIcon } from '../../../components/app-icon';
import { AddCueOptionModal } from '../../../components/cues/add-cue-option-modal';
import { Text } from '../../../components/text';
import { useCuesStore } from '../../../store/cues-store';
import type { MoodId } from '../../../types/cue';
import { Colors } from '../../../utils/colors';
import { getMoodOptions } from '../../../utils/cue-utils';

interface MoodGridProps {
  selectedMood?: MoodId;
  /** Multi-select mode (check-in sheet): these ids are highlighted instead of the single selection. */
  selectedMany?: readonly MoodId[];
  onSelect: (mood: MoodId) => void;
}

export function MoodGrid({ selectedMood, selectedMany, onSelect }: MoodGridProps) {
  const customMoods = useCuesStore(state => state.customMoods);
  const [adding, setAdding] = useState(false);
  return (
    <View style={styles.grid}>
      {getMoodOptions(customMoods).map(option => {
        const selected = selectedMany ? selectedMany.includes(option.id) : option.id === selectedMood;
        return (
          <Pressable
            key={option.id}
            style={({ pressed }) => [styles.tile, selected && styles.selectedTile, pressed && styles.pressed]}
            onPress={() => onSelect(option.id)}
            accessibilityRole={selectedMany ? 'checkbox' : 'radio'}
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
          >
            <AppIcon
              value={option.emoji}
              style={styles.emoji}
            />
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
      <Pressable
        style={({ pressed }) => [styles.tile, styles.addTile, pressed && styles.pressed]}
        onPress={() => setAdding(true)}
        accessibilityRole="button"
        accessibilityLabel="Add mood"
      >
        <Ionicons
          name="add"
          size={30}
          color={Colors.text.muted}
        />
        <Text
          style={styles.label}
          numberOfLines={1}
        >
          Add mood
        </Text>
      </Pressable>
      <AddCueOptionModal
        kind={adding ? 'mood' : undefined}
        onClose={() => setAdding(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  tile: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 8,
    paddingVertical: 15,
  },
  selectedTile: {
    backgroundColor: `${Colors.cue.mood}33`,
    borderColor: Colors.cue.mood,
    borderWidth: 2,
    paddingHorizontal: 7,
    paddingVertical: 14,
  },
  addTile: { borderStyle: 'dashed' },
  emoji: { fontSize: 30 },
  label: { color: Colors.text.muted, fontSize: 13, fontWeight: '700' },
  selectedLabel: { color: Colors.text.primary },
  pressed: { opacity: 0.72 },
});
