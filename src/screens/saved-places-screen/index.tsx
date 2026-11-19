import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CueScreenHeader } from '../../components/cues/cue-screen-header';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { SafeAreaView } from '../../components/safe-area-view';
import { Text } from '../../components/text';
import { useFabCollapse } from '../../hooks/use-fab-collapse';
import { useCuesStore } from '../../store/cues-store';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { AddBehaviorFab } from '../home-screen/components/add-behavior-fab';
import { SavedPlaceRow } from './components/saved-place-row';

export function SavedPlacesScreen() {
  const insets = useSafeAreaInsets();
  const { collapsed: fabCollapsed, onScroll } = useFabCollapse();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const places = useCuesStore(state => state.places);
  const sortedPlaces = useMemo(
    () => [...places].sort((a, b) => Number(b.isHome) - Number(a.isHome) || a.name.localeCompare(b.name)),
    [places],
  );
  const home = sortedPlaces.find(place => place.isHome);
  const others = sortedPlaces.filter(place => !place.isHome);

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <CueScreenHeader title="Saved places" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: 96 + insets.bottom }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {home && (
          <View style={styles.section}>
            <CueSectionLabel>Home</CueSectionLabel>
            <SavedPlaceRow
              place={home}
              onPress={() => navigation.navigate('LocationEdit', { placeId: home.id })}
            />
          </View>
        )}
        <View style={styles.section}>
          <CueSectionLabel>{home ? 'Saved places' : 'Places'}</CueSectionLabel>
          {others.length === 0 && !home && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No saved places</Text>
              <Text style={styles.emptyBody}>Drop a geofence pin to use location cues.</Text>
            </View>
          )}
          {others.map(place => (
            <SavedPlaceRow
              key={place.id}
              place={place}
              onPress={() => navigation.navigate('LocationEdit', { placeId: place.id })}
            />
          ))}
        </View>
      </ScrollView>
      <View
        style={[styles.fab, { bottom: 12 + insets.bottom }]}
        pointerEvents="box-none"
      >
        <AddBehaviorFab
          label="Add location"
          collapsed={fabCollapsed}
          onPress={() => navigation.navigate('LocationEdit')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { gap: 16, paddingHorizontal: 16, paddingBottom: 32 },
  section: { gap: 8 },
  emptyCard: {
    gap: 4,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 16,
  },
  emptyTitle: { color: Colors.text.primary, fontSize: 15, fontWeight: '700' },
  emptyBody: { color: Colors.text.faint, fontSize: 12, lineHeight: 18 },
  fab: { position: 'absolute', right: 16 },
  pressed: { opacity: 0.72 },
});
