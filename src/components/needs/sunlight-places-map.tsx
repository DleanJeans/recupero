import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, Polyline } from 'react-native-maps';
import { useCuesStore } from '../../store/cues-store';
import { useSunlightStore } from '../../store/sunlight-store';
import { Colors } from '../../utils/colors';
import type { GeoPoint } from '../../utils/geofence-utils';
import { getCurrentPointIfPermitted } from '../../utils/location-utils';
import { DARK_MAP_STYLE } from '../../utils/map-style';
import { getPathCoordinates, type SunlightPathSegment } from '../../utils/sunlight-timeline-utils';
import { getSunlightMapRegion, getSunReferencePoint } from '../../utils/sunlight-utils';
import { Text } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';

const INDOOR_COLOR = Colors.cue.location;
const OUTDOOR_COLOR = Colors.type.desirable;

const PATH_EDGE_PADDING = { top: 48, right: 36, bottom: 36, left: 36 };

interface SunlightPlacesMapProps {
  /** Today's route: solid where it counted as outside, dashed where it didn't. */
  path: SunlightPathSegment[];
}

/**
 * Your position, every saved place with the sunlight radius drawn (inside a blue circle = paused) and today's
 * route. Opens fitted to the route when there is one, else centred on you.
 */
export function SunlightPlacesMap({ path }: SunlightPlacesMapProps) {
  const mapRef = useRef<MapView>(null);
  const places = useCuesStore(state => state.places);
  const outdoorPlaceIds = useSunlightStore(state => state.outdoorPlaceIds);
  const radiusM = useSunlightStore(state => state.radiusM);
  const samples = useSunlightStore(state => state.samples);
  const [here, setHere] = useState<GeoPoint | null>(null);
  const fallback = useMemo(() => getSunReferencePoint(samples, places), [samples, places]);
  const center = here ?? fallback;
  const initialRegion = useRef(center ? getSunlightMapRegion(center) : undefined).current;

  const pathCoordinates = useMemo(
    () => getPathCoordinates(path).map(point => ({ latitude: point.lat, longitude: point.lng })),
    [path],
  );
  const hasPath = pathCoordinates.length > 1;

  const locate = (move = true) => {
    getCurrentPointIfPermitted()
      .then(point => {
        if (!point) return;
        setHere(point);
        if (move) mapRef.current?.animateToRegion(getSunlightMapRegion(point), 350);
      })
      .catch(() => undefined);
  };
  const fitPath = () => {
    if (!hasPath) return;
    const coordinates = here ? [...pathCoordinates, { latitude: here.lat, longitude: here.lng }] : pathCoordinates;
    mapRef.current?.fitToCoordinates(coordinates, { edgePadding: PATH_EDGE_PADDING, animated: true });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: on open, find you once (centring only when there's no route).
  useEffect(() => locate(!hasPath), []);

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
        onMapReady={fitPath}
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
        {path.map((segment, index) => (
          <Polyline
            // biome-ignore lint/suspicious/noArrayIndexKey: segments are rebuilt in time order; index is their identity.
            key={index}
            coordinates={segment.points.map(point => ({ latitude: point.lat, longitude: point.lng }))}
            strokeColor={segment.counted ? SUNLIGHT_COLOR : INDOOR_COLOR}
            strokeWidth={segment.counted ? 4 : 2}
            lineDashPattern={segment.counted ? undefined : [6, 6]}
            zIndex={segment.counted ? 2 : 1}
          />
        ))}
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
          {hasPath ? 'Counted route' : 'Anywhere else'}
        </Text>
      </View>

      {hasPath && (
        <Pressable
          style={[styles.locateButton, styles.pathButton]}
          onPress={fitPath}
          accessibilityRole="button"
          accessibilityLabel="Show today's route"
        >
          <Ionicons
            name="footsteps"
            size={18}
            color={SUNLIGHT_COLOR}
          />
        </Pressable>
      )}
      <Pressable
        style={styles.locateButton}
        onPress={() => locate()}
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
    height: 260,
    overflow: 'hidden',
    backgroundColor: '#17202a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  pathButton: {
    right: 58,
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
