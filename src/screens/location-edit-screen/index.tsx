import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../components/button';
import { CueScreenHeader } from '../../components/cues/cue-screen-header';
import { CueToggle } from '../../components/cues/cue-toggle';
import { SafeAreaView } from '../../components/safe-area-view';
import { Text, TextInput } from '../../components/text';
import { useCuesStore } from '../../store/cues-store';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { GeofenceMapPlaceholder } from './components/geofence-map-placeholder';
import { RadiusSlider } from './components/radius-slider';

type LocationEditRoute = NativeStackScreenProps<RootStackParamList, 'LocationEdit'>['route'];

export function LocationEditScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<LocationEditRoute>();
  const placeId = route.params?.placeId;
  const existingPlace = useCuesStore(state => state.places.find(place => place.id === placeId));
  const addPlace = useCuesStore(state => state.addPlace);
  const updatePlace = useCuesStore(state => state.updatePlace);
  const removePlace = useCuesStore(state => state.removePlace);
  const [name, setName] = useState(existingPlace?.name ?? '');
  const [address, setAddress] = useState(existingPlace?.address ?? '');
  const [radiusM, setRadiusM] = useState(existingPlace?.radiusM ?? 150);
  const [isHome, setIsHome] = useState(existingPlace?.isHome ?? false);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name this place', 'Add a short name before saving the geofence.');
      return;
    }
    const input = {
      name: name.trim(),
      address: address.trim() || undefined,
      lat: existingPlace?.lat ?? 10.7769,
      lng: existingPlace?.lng ?? 106.7009,
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
        contentContainerStyle={styles.content}
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
          />
        </View>

        <GeofenceMapPlaceholder radiusM={radiusM} />

        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Home, Office, Gym…"
            placeholderTextColor={Colors.text.faint}
          />
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
          />
        </View>

        <Button
          variant="primary"
          style={styles.saveButton}
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
  saveButton: { borderRadius: 999 },
});
