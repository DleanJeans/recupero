import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CueSegmentedControl } from '../../../components/cues/cue-segmented-control';
import { Text } from '../../../components/text';
import { useCuesStore } from '../../../store/cues-store';
import type { CueTrigger } from '../../../types/cue';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';

type LocationTrigger = Extract<CueTrigger, { type: 'location' }>;

interface LocationTriggerEditorProps {
  value: LocationTrigger;
  onChange: (trigger: LocationTrigger) => void;
}

export function LocationTriggerEditor({ value, onChange }: LocationTriggerEditorProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const places = useCuesStore(state => state.places);

  return (
    <View style={styles.editor}>
      <CueSegmentedControl
        value={value.direction}
        options={[
          { value: 'enter', label: 'When I enter' },
          { value: 'exit', label: 'When I leave' },
        ]}
        onChange={direction => onChange({ ...value, direction })}
      />
      <View style={styles.placeList}>
        {places.map(place => {
          const selected = place.id === value.placeId;
          return (
            <Pressable
              key={place.id}
              style={({ pressed }) => [styles.place, selected && styles.selectedPlace, pressed && styles.pressed]}
              onPress={() => onChange({ ...value, placeId: place.id })}
            >
              <Text style={styles.placeIcon}>{place.isHome ? '🏠' : '📍'}</Text>
              <View style={styles.placeCopy}>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeDetail}>{place.address || `${place.radiusM} m radius`}</Text>
              </View>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={selected ? Colors.cue.location : Colors.text.dim}
              />
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={({ pressed }) => [styles.addPlace, pressed && styles.pressed]}
        onPress={() => navigation.navigate('LocationEdit')}
      >
        <Ionicons
          name="add"
          size={19}
          color={Colors.cue.location}
        />
        <Text style={styles.addPlaceText}>{places.length === 0 ? 'Drop a new geofence' : 'Add another place'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: 10 },
  placeList: { gap: 7 },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.bg.input,
    padding: 10,
  },
  selectedPlace: { borderColor: Colors.cue.location, backgroundColor: `${Colors.cue.location}12` },
  placeIcon: { width: 28, fontSize: 21, textAlign: 'center' },
  placeCopy: { flex: 1, gap: 2 },
  placeName: { color: Colors.text.primary, fontSize: 14, fontWeight: '700' },
  placeDetail: { color: Colors.text.faint, fontSize: 11 },
  addPlace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9 },
  addPlaceText: { color: Colors.cue.location, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});
