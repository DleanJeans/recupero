import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, type LatLng, Marker } from 'react-native-maps';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { formatCoordinate, type GeoPoint, regionForGeofence } from '../../../utils/geofence-utils';
import { DARK_MAP_STYLE } from '../../../utils/map-style';

interface GeofenceMapProps {
  point: GeoPoint | null;
  radiusM: number;
  isLocating: boolean;
  onChangePoint: (point: GeoPoint) => void;
  onLocateMe: () => void;
}

/** Fallback view (whole world) until we know where to center. */
const WORLD_REGION = { latitude: 20, longitude: 0, latitudeDelta: 100, longitudeDelta: 100 };

export function GeofenceMap({ point, radiusM, isLocating, onChangePoint, onLocateMe }: GeofenceMapProps) {
  const mapRef = useRef<MapView>(null);
  const initialRegion = useRef(point ? regionForGeofence(point, radiusM) : WORLD_REGION).current;

  useEffect(() => {
    if (!point) return;
    mapRef.current?.animateToRegion(regionForGeofence(point, radiusM), 350);
  }, [point, radiusM]);

  const handleCoordinateEvent = (event: { nativeEvent: { coordinate: LatLng } }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    onChangePoint({ lat: latitude, lng: longitude });
  };

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
        onPress={handleCoordinateEvent}
        onLongPress={handleCoordinateEvent}
      >
        {point && (
          <>
            <Circle
              center={{ latitude: point.lat, longitude: point.lng }}
              radius={radiusM}
              fillColor={`${Colors.cue.location}30`}
              strokeColor={Colors.cue.location}
              strokeWidth={2}
            />
            <Marker
              coordinate={{ latitude: point.lat, longitude: point.lng }}
              pinColor={Colors.cue.location}
              draggable
              onDragEnd={handleCoordinateEvent}
            />
          </>
        )}
      </MapView>

      <View
        style={styles.chip}
        pointerEvents="none"
      >
        <Text style={styles.chipText}>{point ? `📍 ${formatCoordinate(point)}` : 'Tap the map to drop a pin'}</Text>
      </View>

      <Pressable
        style={styles.locateButton}
        onPress={onLocateMe}
        disabled={isLocating}
        accessibilityRole="button"
        accessibilityLabel="Use my current location"
      >
        {isLocating ? (
          <ActivityIndicator
            size="small"
            color={Colors.cue.location}
          />
        ) : (
          <Ionicons
            name="locate"
            size={20}
            color={Colors.cue.location}
          />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 260,
    overflow: 'hidden',
    backgroundColor: '#17202a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  chip: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: Colors.bg.card,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { color: Colors.text.secondary, fontSize: 11, fontWeight: '700' },
  locateButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.card,
  },
});
