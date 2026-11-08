import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { SavedPlace } from '../../../types/cue';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { getPlaceEmoji } from '../../../utils/cue-utils';

interface TaskPlacePickerProps {
  places: SavedPlace[];
  selectedPlaceId: string | undefined;
  onSelect: (placeId: string | undefined) => void;
}

/** "Go to this location": pick a saved place and the task ticks itself off on arrival. */
export function TaskPlacePicker({ places, selectedPlaceId, onSelect }: TaskPlacePickerProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selectedPlace = places.find(place => place.id === selectedPlaceId);

  return (
    <View style={styles.picker}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}
      >
        <Ionicons
          name="location-outline"
          size={16}
          color={selectedPlace ? Colors.cue.location : Colors.text.faint}
          style={styles.leadingIcon}
        />
        {places.map(place => {
          const selected = place.id === selectedPlaceId;
          return (
            <Pressable
              key={place.id}
              style={({ pressed }) => [styles.chip, selected && styles.selectedChip, pressed && styles.pressed]}
              onPress={() => onSelect(selected ? undefined : place.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Go to ${place.name}`}
            >
              <Text style={styles.chipEmoji}>{getPlaceEmoji(place)}</Text>
              <Text style={[styles.chipText, selected && styles.selectedChipText]}>{place.name}</Text>
            </Pressable>
          );
        })}
        <Pressable
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          onPress={() => navigation.navigate('LocationEdit')}
          accessibilityRole="button"
          accessibilityLabel="Add a place"
        >
          <Ionicons
            name="add"
            size={15}
            color={Colors.cue.location}
          />
          <Text style={styles.addText}>{places.length === 0 ? 'Add a place' : 'Place'}</Text>
        </Pressable>
      </ScrollView>
      <Text style={styles.hint}>
        {selectedPlace
          ? `Ticks itself off when you arrive at ${selectedPlace.name}.`
          : 'Optional: pick a place to tick this off when you arrive.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { gap: 6 },
  chips: { alignItems: 'center', gap: 6 },
  leadingIcon: { marginRight: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.bg.input,
    backgroundColor: Colors.bg.input,
  },
  selectedChip: { borderColor: Colors.cue.location, backgroundColor: `${Colors.cue.location}1f` },
  chipEmoji: { fontSize: 14 },
  chipText: { color: Colors.text.muted, fontSize: 13, fontWeight: '600' },
  selectedChipText: { color: Colors.text.primary },
  addText: { color: Colors.cue.location, fontSize: 13, fontWeight: '700' },
  hint: { color: Colors.text.faint, fontSize: 11, marginLeft: 2 },
  pressed: { opacity: 0.72 },
});
