import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/button';
import { CueScreenHeader } from '../../components/cues/cue-screen-header';
import { CueToggle } from '../../components/cues/cue-toggle';
import { EmojiPicker } from '../../components/emoji-picker';
import { RadiusSlider } from '../../components/radius-slider';
import { SafeAreaView } from '../../components/safe-area-view';
import { Text, TextInput } from '../../components/text';
import { useCuesStore } from '../../store/cues-store';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { clampGeofenceRadius, type GeoPoint } from '../../utils/geofence-utils';
import { geocodeAddress, getCurrentPoint, reverseGeocodePoint } from '../../utils/location-utils';
import { GeofenceMap } from './components/geofence-map';

type LocationEditRoute = NativeStackScreenProps<RootStackParamList, 'LocationEdit'>['route'];

export function LocationEditScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<LocationEditRoute>();
  const placeId = route.params?.placeId;
  const existingPlace = useCuesStore(state => state.places.find(place => place.id === placeId));
  const addPlace = useCuesStore(state => state.addPlace);
  const updatePlace = useCuesStore(state => state.updatePlace);
  const removePlace = useCuesStore(state => state.removePlace);
  const [name, setName] = useState(existingPlace?.name ?? '');
  const [emoji, setEmoji] = useState(existingPlace?.emoji ?? '');
  const [address, setAddress] = useState(existingPlace?.address ?? '');
  const [radiusM, setRadiusM] = useState(clampGeofenceRadius(existingPlace?.radiusM ?? 20));
  const [isHome, setIsHome] = useState(existingPlace?.isHome ?? false);
  const [point, setPoint] = useState<GeoPoint | null>(
    existingPlace ? { lat: existingPlace.lat, lng: existingPlace.lng } : null,
  );
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
      // Reverse geocoding is best-effort; the pin is what matters.
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: only center on the user once, for new places
  useEffect(() => {
    if (!existingPlace) handleLocateMe(true);
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

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name this place', 'Add a short name before saving the geofence.');
      return;
    }
    if (!point) {
      Alert.alert('Pick a spot', 'Search for an address or tap the map to drop a pin.');
      return;
    }
    const input = {
      name: name.trim(),
      emoji: emoji.trim() || undefined,
      address: address.trim() || undefined,
      lat: point.lat,
      lng: point.lng,
      radiusM,
      isHome,
    };
    if (existingPlace) updatePlace(existingPlace.id, input);
    else addPlace(input);
    navigation.goBack();
  };

  const handleDelete = () => {
    if (!existingPlace) return;
    Alert.alert('Delete location?', 'Cues using this place will be turned off.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removePlace(existingPlace.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <CueScreenHeader
        title={existingPlace ? 'Edit location' : 'Add location'}
        showBalance={false}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
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
          <Text style={styles.fieldLabel}>Name</Text>
          <View style={styles.nameRow}>
            <EmojiPicker
              value={emoji}
              onChangeText={setEmoji}
              nameHint={name}
              style={styles.emojiBox}
            />
            <TextInput
              style={[styles.input, styles.nameInput]}
              value={name}
              onChangeText={setName}
              placeholder="Home, Office, Gym…"
              placeholderTextColor={Colors.text.faint}
            />
          </View>
          {emoji ? (
            <Text
              style={styles.clearEmoji}
              onPress={() => setEmoji('')}
              accessibilityRole="button"
            >
              Use the default pin instead
            </Text>
          ) : null}
        </View>

        <RadiusSlider
          value={radiusM}
          onChange={setRadiusM}
        />

        <View style={styles.homeRow}>
          <View style={styles.homeIcon}>
            <Ionicons
              name="home-outline"
              size={20}
              color={Colors.cue.location}
            />
          </View>
          <View style={styles.homeCopy}>
            <Text style={styles.homeTitle}>Set as Home</Text>
            <Text style={styles.homeDetail}>Home stays pinned at the top of saved places.</Text>
          </View>
          <CueToggle
            value={isHome}
            accent={Colors.cue.location}
            onValueChange={setIsHome}
            accessibilityLabel="Set as Home"
          />
        </View>

        <Button
          variant="primary"
          onPress={handleSave}
        >
          Save location
        </Button>
        {existingPlace && (
          <Button
            variant="danger"
            onPress={handleDelete}
          >
            Delete location
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { gap: 14, paddingHorizontal: 16, paddingBottom: 32 },
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emojiBox: { width: 48, height: 44, borderRadius: 9 },
  nameInput: { flex: 1 },
  clearEmoji: { alignSelf: 'flex-start', color: Colors.text.faint, fontSize: 12, fontWeight: '600' },
  input: {
    height: 44,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.input,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 0,
    fontSize: 14,
  },
  homeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 12,
  },
  homeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.cue.location}1f`,
  },
  homeCopy: { flex: 1, gap: 2 },
  homeTitle: { color: Colors.text.primary, fontSize: 14, fontWeight: '700' },
  homeDetail: { color: Colors.text.faint, fontSize: 11, lineHeight: 16 },
});
