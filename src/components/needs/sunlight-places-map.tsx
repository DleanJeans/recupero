import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { useCuesStore } from '../../store/cues-store';
import { useSunlightStore } from '../../store/sunlight-store';
import { Colors } from '../../utils/colors';
import type { GeoPoint } from '../../utils/geofence-utils';
import { getCurrentPointIfPermitted } from '../../utils/location-utils';
import { DARK_MAP_STYLE } from '../../utils/map-style';
import { getSunlightMapRegion, getSunReferencePoint } from '../../utils/sunlight-utils';
import { Text } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';

const INDOOR_COLOR = Colors.cue.location;
const OUTDOOR_COLOR = Colors.type.desirable;

/** Your position and every saved place with the sunlight radius drawn: inside a blue circle = paused. */
export function SunlightPlacesMap() {
  const mapRef = useRef<MapView>(null);
  const places = useCuesStore(state => state.places);
  const outdoorPlaceIds = useSunlightStore(state => state.outdoorPlaceIds);
  const radiusM = useSunlightStore(state => state.radiusM);
  const samples = useSunlightStore(state => state.samples);
  const [here, setHere] = useState<GeoPoint | null>(null);
  const fallback = useMemo(() => getSunReferencePoint(samples, places), [samples, places]);
  const center = here ?? fallback;
  const initialRegion = useRef(center ? getSunlightMapRegion(center) : undefined).current;

  const locate = () => {
    getCurrentPointIfPermitted()
      .then(point => {
        if (!point) return;
        setHere(point);
        mapRef.current?.animateToRegion(getSunlightMapRegion(point), 350);
      })
      .catch(() => undefined);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: centre on you once when the map opens.
  useEffect(locate, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        customMapStyle={DARK_MAP_STYLE}
        userInterfaceStyle="dark"
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {places.map(place => {
          const outdoor = outdoorPlaceIds.includes(place.id);
          const color = outdoor ? OUTDOOR_COLOR : INDOOR_COLOR;
          const coordinate = { latitude: place.lat, longitude: place.lng };
          return (
            <React.Fragment key={place.id}>
              <Circle
                center={coordinate}
                radius={outdoor ? place.radiusM : radiusM}
                fillColor={`${color}30`}
                strokeColor={color}
                strokeWidth={2}
              />
              <Marker
                coordinate={coordinate}
                title={place.name}
                description={outdoor ? 'Counts as outside' : `Paused within ${radiusM} m`}
                pinColor={color}
              />
            </React.Fragment>
          );
        })}
      </MapView>

      <View
        style={styles.legend}
        pointerEvents="none"
      >
        <Text style={styles.legendText}>
          <Text style={{ color: INDOOR_COLOR }}>● </Text>
          Paused inside
          {outdoorPlaceIds.length > 0 ? (
            <>
              <Text style={{ color: OUTDOOR_COLOR }}>{'   ● '}</Text>
              Counts as outside
            </>
          ) : null}
          <Text style={{ color: SUNLIGHT_COLOR }}>{'   ● '}</Text>
          Anywhere else
        </Text>
      </View>

      <Pressable
        style={styles.locateButton}
        onPress={locate}
        accessibilityRole="button"
        accessibilityLabel="Centre on my location"
      >
        <Ionicons
          name="locate"
          size={20}
          color={INDOOR_COLOR}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 240,
    overflow: 'hidden',
    backgroundColor: '#17202a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  legend: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    alignItems: 'flex-start',
  },
  legendText: {
    backgroundColor: Colors.bg.card,
    color: Colors.text.secondary,
    fontSize: 11,
    fontWeight: '600',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  locateButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.card,
  },
});
