import * as Location from 'expo-location';
import { useCuesStore } from '../store/cues-store';
import { useSunlightStore } from '../store/sunlight-store';
import { findPlaceAtPoint } from './geofence-utils';
import { syncSunlightNotification } from './sunlight-notification';
import {
  getIndoorPlaces,
  getSunReferencePoint,
  getWeatherUrl,
  parseWeatherHours,
  roundCoordinate,
  shouldRefreshWeather,
} from './sunlight-utils';

const MIN_SAMPLE_GAP_MS = 5 * 60_000;
/** A fix vaguer than this is a cell-tower guess; keep the last known state instead. */
const MAX_SAMPLE_ACCURACY_M = 100;
const SAMPLE_COORD_DECIMALS = 3;

/** Checks where the phone is now (only if location is already allowed) and records whether it's at a tracked place. */
async function samplePresence(now: number, force: boolean): Promise<void> {
  const { samples, outdoorPlaceIds, radiusM, addSample } = useSunlightStore.getState();
  const last = samples[samples.length - 1];
  if (!force && last && now - last.ts < MIN_SAMPLE_GAP_MS) return;
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return;
  // GPS, not Wi-Fi/cell: with a 10 m radius a Balanced fix (often 50-100 m off) can't tell home from the street.
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const { latitude, longitude, accuracy } = position.coords;
  if (accuracy != null && accuracy > MAX_SAMPLE_ACCURACY_M) return;
  // Judge by the fix's centre (the blue dot), not its accuracy circle, so being down the street counts as out.
  const indoor = getIndoorPlaces(useCuesStore.getState().places, outdoorPlaceIds).map(place => ({ ...place, radiusM }));
  const place = findPlaceAtPoint(indoor, { lat: latitude, lng: longitude });
  addSample({
    ts: position.timestamp || now,
    placeId: place?.id ?? null,
    lat: roundCoordinate(latitude, SAMPLE_COORD_DECIMALS),
    lng: roundCoordinate(longitude, SAMPLE_COORD_DECIMALS),
  });
}

/** Refreshes hourly sunshine for the past week (estimated lux) when it's over an hour old or you've moved. */
async function refreshWeather(now: number): Promise<void> {
  const { samples, weather, setWeather } = useSunlightStore.getState();
  const point = getSunReferencePoint(samples, useCuesStore.getState().places);
  if (!point || !shouldRefreshWeather(weather, point, now)) return;
  const response = await fetch(getWeatherUrl(point));
  if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
  const hours = parseWeatherHours(await response.json());
  if (hours.length === 0) return;
  setWeather({ fetchedAt: now, lat: roundCoordinate(point.lat), lng: roundCoordinate(point.lng), hours });
}

/**
 * Run on launch and whenever Recupero comes to the foreground. `force` checks the position even if it
 * was checked a moment ago (opening the Sunlight sheet).
 */
export async function syncSunlight(force = false): Promise<void> {
  if (!useSunlightStore.getState().enabled) return;
  const now = Date.now();
  await samplePresence(now, force).catch(error => console.warn('Sunlight position check failed', error));
  await refreshWeather(now).catch(error => console.warn('Sunlight weather failed', error));
  syncSunlightNotification();
}
