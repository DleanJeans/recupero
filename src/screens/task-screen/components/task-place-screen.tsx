import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/app-icon';
import { Button } from '../../../components/button';
import { FullScreenModal } from '../../../components/full-screen-modal';
import { Text } from '../../../components/text';
import { usePeopleStore } from '../../../store/people-store';
import type { SavedPlace } from '../../../types/cue';
import type { OneOffPlace } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import { getPlaceEmoji } from '../../../utils/cue-utils';
import { formatPlaceDwell, PLACE_DWELL_OPTIONS_MIN } from '../../../utils/place-task-utils';

interface TaskPlaceScreenProps {
  places: SavedPlace[];
  selectedPlaceId: string | undefined;
  onSelect: (placeId: string | undefined) => void;
  /** A spot picked just for this task (not a saved place), and the handler that opens its map picker. */
  oneOffPlace?: OneOffPlace;
  /** Opens the map picker that saves a new place to the saved places. Omit to hide the row. */
  onAddPlace?: () => void;
  /** Called with a contact's pinned home address as a spot for this task. Omit to hide the contacts section. */
  onPickPerson?: (place: OneOffPlace) => void;
  /** Omit to hide the one-off option (e.g. batch edit). */
  onPickOneOff?: () => void;
  dwellMin: number;
  onDwellChange: (minutes: number) => void;
  onClose: () => void;
}

/** "Go to this location": pick a saved place (and how long to stay) so the task ticks itself off there. */
export function TaskPlaceScreen({
  places,
  selectedPlaceId,
  onSelect,
  oneOffPlace,
  onAddPlace,
  onPickPerson,
  onPickOneOff,
  dwellMin,
  onDwellChange,
  onClose,
}: TaskPlaceScreenProps) {
  const insets = useSafeAreaInsets();
  const people = usePeopleStore(state => state.people);
  const homes = people.filter(person => person.lat != null && person.lng != null);
  const selectedPlace = places.find(place => place.id === selectedPlaceId);
  const selectedName = selectedPlace?.name ?? oneOffPlace?.name;

  return (
    <FullScreenModal
      title="Choose a place"
      onClose={onClose}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}>
        <Text style={styles.hint}>The task ticks itself off when you get there.</Text>
        {places.length === 0 && <Text style={styles.hint}>No saved places yet. Add one below.</Text>}
        {places.map(place => {
          const selected = place.id === selectedPlaceId;
          return (
            <Pressable
              key={place.id}
              style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.pressed]}
              onPress={() => onSelect(selected ? undefined : place.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <AppIcon
                value={getPlaceEmoji(place)}
                style={styles.emoji}
              />
              <Text
                style={styles.name}
                numberOfLines={1}
              >
                {place.name}
              </Text>
              {selected && (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={Colors.cue.location}
                />
              )}
            </Pressable>
          );
        })}
        {onPickPerson && homes.length > 0 && <Text style={styles.heading}>Contacts' homes</Text>}
        {onPickPerson &&
          homes.map(person => {
            const name = `${person.name}'s home`;
            const selected = oneOffPlace?.lat === person.lat && oneOffPlace?.lng === person.lng;
            return (
              <Pressable
                key={person.id}
                style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.pressed]}
                onPress={() =>
                  onPickPerson({
                    name,
                    emoji: person.emoji || undefined,
                    lat: person.lat as number,
                    lng: person.lng as number,
                    radiusM: 50,
                  })
                }
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <AppIcon
                  value={person.emoji || '🏠'}
                  style={styles.emoji}
                />
                <Text
                  style={styles.name}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                {selected && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={Colors.cue.location}
                  />
                )}
              </Pressable>
            );
          })}
        {onAddPlace && (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={onAddPlace}
            accessibilityRole="button"
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={Colors.cue.location}
            />
            <Text
              style={styles.name}
              numberOfLines={1}
            >
              Add a new place
            </Text>
          </Pressable>
        )}
        {onPickOneOff && (
          <Pressable
            style={({ pressed }) => [styles.row, oneOffPlace && styles.rowSelected, pressed && styles.pressed]}
            onPress={onPickOneOff}
            accessibilityRole="button"
            accessibilityState={{ selected: oneOffPlace != null }}
          >
            <Ionicons
              name="map-outline"
              size={20}
              color={Colors.cue.location}
            />
            <Text
              style={styles.name}
              numberOfLines={1}
            >
              {oneOffPlace ? `${oneOffPlace.name} (one-off)` : 'Pick a spot on the map (one-off)'}
            </Text>
            {oneOffPlace && (
              <Ionicons
                name="checkmark"
                size={20}
                color={Colors.cue.location}
              />
            )}
          </Pressable>
        )}
        {selectedName && (
          <>
            <Text style={styles.heading}>Stay before it ticks</Text>
            <View style={styles.chips}>
              {PLACE_DWELL_OPTIONS_MIN.map(minutes => {
                const selected = minutes === dwellMin;
                return (
                  <Pressable
                    key={minutes}
                    style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
                    onPress={() => onDwellChange(minutes)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[styles.chipText, selected && styles.chipTextSelected]}
                      numberOfLines={1}
                    >
                      {formatPlaceDwell(minutes)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>
              {dwellMin > 0
                ? `Ticks itself off after you stay ${formatPlaceDwell(dwellMin)} at ${selectedName}.`
                : `Ticks itself off as soon as you arrive at ${selectedName}.`}
            </Text>
          </>
        )}
        <Button
          variant="primary"
          onPress={onClose}
        >
          Done
        </Button>
      </ScrollView>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  hint: { color: Colors.text.muted, fontSize: 12 },
  heading: { color: Colors.text.primary, fontSize: 15, fontWeight: '600', marginTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.bg.input,
    backgroundColor: Colors.bg.input,
  },
  rowSelected: { borderColor: Colors.cue.location, backgroundColor: `${Colors.cue.location}1f` },
  emoji: { fontSize: 20 },
  name: { flex: 1, color: Colors.text.primary, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.bg.input,
    backgroundColor: Colors.bg.input,
  },
  chipSelected: { borderColor: Colors.cue.location, backgroundColor: `${Colors.cue.location}1f` },
  chipText: { color: Colors.text.muted, fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: Colors.text.primary },
  pressed: { opacity: 0.72 },
});
