import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../components/button';
import { FullScreenModal } from '../../../components/full-screen-modal';
import { RadiusSlider } from '../../../components/radius-slider';
import { Text, TextInput } from '../../../components/text';
import type { OneOffPlace } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import { clampGeofenceRadius, type GeoPoint } from '../../../utils/geofence-utils';
import { geocodeAddress, getCurrentPoint, reverseGeocodePoint } from '../../../utils/location-utils';
import { GeofenceMap } from '../../location-edit-screen/components/geofence-map';

interface TaskOneOffPlaceScreenProps {
  value: OneOffPlace | undefined;
  onSave: (place: OneOffPlace) => void;
  onClose: () => void;
}

/** Pick a spot on the map for this task only. It is not added to saved places. */
export function TaskOneOffPlaceScreen({ value, onSave, onClose }: TaskOneOffPlaceScreenProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(value?.name ?? '');
  const [address, setAddress] = useState('');
  const [radiusM, setRadiusM] = useState(clampGeofenceRadius(value?.radiusM ?? 50));
  const [point, setPoint] = useState<GeoPoint | null>(value ? { lat: value.lat, lng: value.lng } : null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  /** Latest pin request; stale reverse-geocode results are ignored. */
  const pinRequestId = useRef(0);

  const dropPin = async (next: GeoPoint, fillAddress: boolean) => {
    const requestId = ++pinRequestId.current;
    setPoint(next);
    if (!fillAddress) return;
    try {
      const resolved = await reverseGeocodePoint(next);
      if (resolved && requestId === pinRequestId.current) setAddress(resolved);
    } catch {
      // Best-effort; the pin is what matters.
    }
  };

  const handleLocateMe = async (silent = false) => {
    setIsLocating(true);
    try {
      const current = await getCurrentPoint();
      if (current) await dropPin(current, true);
      else if (!silent) Alert.alert('Location unavailable', 'Allow location access, or tap the map to drop a pin.');
    } catch {
      if (!silent) Alert.alert('Location unavailable', 'Could not get your position. Tap the map to drop a pin.');
    } finally {
      setIsLocating(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: only center on the user once, for a new place
  useEffect(() => {
    if (!value) handleLocateMe(true);
  }, []);

  const handleSearch = async () => {
    const query = address.trim();
    if (!query) return;
    setIsSearching(true);
    try {
      const found = await geocodeAddress(query);
      if (found) await dropPin(found, false);
      else Alert.alert('No match', `Couldn't find "${query}". Try a fuller address, or tap the map.`);
    } catch {
      Alert.alert('Search failed', 'Check your connection, or tap the map to drop a pin.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUse = () => {
    if (!point) {
      Alert.alert('Pick a spot', 'Search for an address or tap the map to drop a pin.');
      return;
    }
    const fallbackName = address.split(',')[0]?.trim() || 'Pinned spot';
    onSave({ name: name.trim() || fallbackName, lat: point.lat, lng: point.lng, radiusM });
  };

  return (
    <FullScreenModal
      title="Pick a spot"
      onClose={onClose}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={18}
            color={Colors.text.faint}
          />
          <TextInput
            style={styles.searchInput}
            value={address}
            onChangeText={setAddress}
            placeholder="Search address or place"
            placeholderTextColor={Colors.text.faint}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            editable={!isSearching}
          />
          {isSearching && (
            <ActivityIndicator
              size="small"
              color={Colors.text.faint}
            />
          )}
        </View>
        <GeofenceMap
          point={point}
          radiusM={radiusM}
          isLocating={isLocating}
          onChangePoint={next => dropPin(next, true)}
          onLocateMe={() => handleLocateMe()}
        />
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>Name (optional)</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Dentist, Mom's place…"
            placeholderTextColor={Colors.text.faint}
          />
        </View>
        <RadiusSlider
          value={radiusM}
          onChange={setRadiusM}
        />
        <Text style={styles.hint}>Only this task uses this spot. It is not added to your saved places.</Text>
        <Button
          variant="primary"
          onPress={handleUse}
        >
          Use this spot
        </Button>
      </ScrollView>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingHorizontal: 16, paddingTop: 8 },
  searchBar: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bg.input,
    borderRadius: 11,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, height: 46, color: Colors.text.primary, fontSize: 14, paddingVertical: 0 },
  fieldCard: { gap: 8, backgroundColor: Colors.bg.card, borderRadius: 12, padding: 13 },
  fieldLabel: { color: Colors.text.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  input: {
    height: 44,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.input,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 0,
    fontSize: 14,
  },
  hint: { color: Colors.text.muted, fontSize: 12 },
});
