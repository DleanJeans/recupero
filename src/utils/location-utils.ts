import * as Location from 'expo-location';
import { formatGeocodedAddress, type GeoPoint } from './geofence-utils';

/** Asks for foreground location permission and returns the device's position, or null if unavailable. */
export async function getCurrentPoint(): Promise<GeoPoint | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
  const position = lastKnown ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

export async function geocodeAddress(query: string): Promise<GeoPoint | null> {
  const results = await Location.geocodeAsync(query);
  const first = results[0];
  return first ? { lat: first.latitude, lng: first.longitude } : null;
}

export async function reverseGeocodePoint(point: GeoPoint): Promise<string | null> {
  const results = await Location.reverseGeocodeAsync({ latitude: point.lat, longitude: point.lng });
  const first = results[0];
  return first ? formatGeocodedAddress(first) || null : null;
}
