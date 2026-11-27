import * as Location from 'expo-location';
import { useCuesStore } from '../store/cues-store';
import { useSunlightStore } from '../store/sunlight-store';
import type { SavedPlace } from '../types/cue';
import { distanceMeters } from './geofence-utils';
import { syncSunlightNotification } from './sunlight-notification';
import {
  describeSunlightFix,
  getIndoorPlaces,
  getSunReferencePoint,
  getWeatherUrl,
  hasLeftPausePin,
  isClearlyInsidePlace,
  isUsableSunlightFix,
  isWobbleSample,
  MAX_FIX_ACCURACY_M,
  parseWeatherHours,
  roundCoordinate,
  SUNLIGHT_PIN_RADIUS_M,
  shouldRefreshWeather,
} from './sunlight-utils';

const MIN_SAMPLE_GAP_MS = 5 * 60_000;
const SAMPLE_COORD_DECIMALS = 3;

/** Checks where the phone is now (only if location is already allowed) and records whether it's at a tracked place. */
async function samplePresence(now: number, force: boolean): Promise<void> {
  const { samples, outdoorPlaceIds, addSample, pause, resumeSunlight } = useSunlightStore.getState();
  const last = samples[samples.length - 1];
  if (!force && last && now - last.ts < MIN_SAMPLE_GAP_MS) return;
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return;
  // GPS, not Wi-Fi/cell: with a 10 m radius a Balanced fix (often 50-100 m off) can't tell home from the street.
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const { latitude, longitude, accuracy } = position.coords;
  // A pinned pause ends (and its pin goes) once you're outside the pin's radius.
  if (pause?.pin && hasLeftPausePin(pause.pin, { lat: latitude, lng: longitude }, SUNLIGHT_PIN_RADIUS_M, accuracy))
    resumeSunlight();
  // Judge by the fix's centre (the blue dot), not its accuracy circle, so being down the street counts as out.
  const indoor = getIndoorPlaces(useCuesStore.getState().places, outdoorPlaceIds);
  const fix = describeSunlightFix(indoor, { lat: latitude, lng: longitude }, accuracy);
  if (!isUsableSunlightFix(fix, accuracy)) return;
  addSample({
    ts: position.timestamp || now,
    ...fix,
    lat: roundCoordinate(latitude, SAMPLE_COORD_DECIMALS),
    lng: roundCoordinate(longitude, SAMPLE_COORD_DECIMALS),
  });
}

const EXIT_CHECK_TIMEOUT_MS = 15_000;

/**
 * Double-checks a geofence "left" with a GPS fix. Android reports false exits while you sleep (Wi-Fi/cell
 * jitter); a good fix still well inside the place proves it, so that exit is dropped. A real departure is
 * recorded as an "away" sample so the stretch out is confirmed. Returns whether the exit should be kept.
 */
export async function confirmSunlightExit(placeId: string): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return true;
    const { outdoorPlaceIds, addSample } = useSunlightStore.getState();
    const indoor = getIndoorPlaces(useCuesStore.getState().places, outdoorPlaceIds);
    const place = indoor.find(candidate => candidate.id === placeId);
    if (!place) return true;
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>(resolve => setTimeout(() => resolve(null), EXIT_CHECK_TIMEOUT_MS)),
    ]);
    if (!position) return true;
    const { latitude, longitude, accuracy } = position.coords;
    if (accuracy != null && accuracy > MAX_FIX_ACCURACY_M) return true;
    const point = { lat: latitude, lng: longitude };
    const fix = describeSunlightFix(indoor, point, accuracy);
    const sample = {
      ts: position.timestamp || Date.now(),
      ...fix,
      lat: roundCoordinate(latitude, SAMPLE_COORD_DECIMALS),
      lng: roundCoordinate(longitude, SAMPLE_COORD_DECIMALS),
    };
    if (isClearlyInsidePlace(distanceMeters(place, point), place.radiusM) && fix.placeId != null) {
      addSample(sample);
      return false;
    }
    // Just past the edge could still be wobble; only a clearly-away fix confirms the departure.
    if (!isWobbleSample(sample)) addSample(sample);
    return true;
  } catch {
    return true;
  }
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

/** Beyond this, a fix is too vague to say where the phone really is. */
const MAX_NEW_PLACE_ACCURACY_M = 150;

/**
 * You just saved a place. If you're standing in it (the usual reason to add one), the stretch outside ends
 * now, not whenever the next geofence event or position check happens to notice, so time already counted stays.
 */
export async function closeOutdoorStretchAtNewPlace(place: SavedPlace, addedAt: number): Promise<void> {
  const { enabled, outdoorPlaceIds, addSample } = useSunlightStore.getState();
  if (!enabled || outdoorPlaceIds.includes(place.id)) return;
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return;
  const position =
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null)) ??
    (await Location.getLastKnownPositionAsync().catch(() => null));
  if (!position) return;
  const { latitude, longitude, accuracy } = position.coords;
  // Judged leniently on purpose: indoors the fix is often vague, and you're adding the place where you stand.
  const slack = Math.min(accuracy ?? 0, MAX_NEW_PLACE_ACCURACY_M);
  const inside =
    distanceMeters({ lat: latitude, lng: longitude }, { lat: place.lat, lng: place.lng }) <= place.radiusM + slack;
  if (!inside) return;
  addSample({
    ts: addedAt,
    placeId: place.id,
    lat: roundCoordinate(latitude, SAMPLE_COORD_DECIMALS),
    lng: roundCoordinate(longitude, SAMPLE_COORD_DECIMALS),
  });
  syncSunlightNotification();
}

/** Reloads the sunlight store from storage, keeping anything only this copy of the app has (see the store's merge). */
export async function rehydrateSunlight(): Promise<void> {
  try {
    await useSunlightStore.persist.rehydrate();
  } catch (error) {
    console.warn('Sunlight reload failed', error);
  }
}
