export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface GeocodedAddressParts {
  name?: string | null;
  streetNumber?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  formattedAddress?: string | null;
}

const METERS_PER_DEGREE_LAT = 111_320;
/** How many radii of padding to show around the geofence circle. */
const RADIUS_VIEW_FACTOR = 3;
const MIN_SPAN_M = 150;

/** Map region centered on a point, zoomed so the geofence circle fits with padding. */
export function regionForGeofence(point: GeoPoint, radiusM: number): MapRegion {
  const spanM = Math.max(MIN_SPAN_M, radiusM * 2 * RADIUS_VIEW_FACTOR);
  const latitudeDelta = spanM / METERS_PER_DEGREE_LAT;
  const cosLat = Math.max(0.01, Math.cos((point.lat * Math.PI) / 180));
  return {
    latitude: point.lat,
    longitude: point.lng,
    latitudeDelta,
    longitudeDelta: latitudeDelta / cosLat,
  };
}

/** Short, human-friendly single-line address from a reverse-geocode result. */
export function formatGeocodedAddress(address: GeocodedAddressParts): string {
  const street = [address.streetNumber, address.street].filter(Boolean).join(' ');
  const parts: string[] = [];
  const name = address.name?.trim();
  if (name && name !== street && name !== address.streetNumber) parts.push(name);
  if (street) parts.push(street);
  const locality = address.district || address.city || address.region;
  if (locality) parts.push(locality);
  if (parts.length === 0) return address.formattedAddress?.trim() || address.country || '';
  return [...new Set(parts)].join(', ');
}

export function formatCoordinate(point: GeoPoint): string {
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

export const MIN_GEOFENCE_RADIUS_M = 1;
/** Large building / small campus. Bigger areas are better split into several places. */
export const MAX_GEOFENCE_RADIUS_M = 200;
const FINE_STEP_LIMIT_M = 50;

export function clampGeofenceRadius(radiusM: number): number {
  return Math.max(MIN_GEOFENCE_RADIUS_M, Math.min(MAX_GEOFENCE_RADIUS_M, radiusM));
}

/** 1 m steps for small radii, 5 m steps above 50 m. */
export function roundGeofenceRadius(radiusM: number): number {
  const step = radiusM < FINE_STEP_LIMIT_M ? 1 : 5;
  return clampGeofenceRadius(Math.round(radiusM / step) * step);
}

/**
 * Log-scale slider mapping: equal slider distance = equal ratio change, so
 * 10→20 m gets as much travel as 100→200 m.
 */
export function radiusToSliderRatio(radiusM: number): number {
  const clamped = clampGeofenceRadius(radiusM);
  return Math.log(clamped / MIN_GEOFENCE_RADIUS_M) / Math.log(MAX_GEOFENCE_RADIUS_M / MIN_GEOFENCE_RADIUS_M);
}

export function sliderRatioToRadius(ratio: number): number {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const raw = MIN_GEOFENCE_RADIUS_M * (MAX_GEOFENCE_RADIUS_M / MIN_GEOFENCE_RADIUS_M) ** clampedRatio;
  return roundGeofenceRadius(raw);
}

/** Next radius for the −/+ buttons: 1 m below 50 m, 5 m above. */
export function stepGeofenceRadius(radiusM: number, direction: 1 | -1): number {
  const current = clampGeofenceRadius(radiusM);
  const step = direction > 0 ? (current < FINE_STEP_LIMIT_M ? 1 : 5) : current <= FINE_STEP_LIMIT_M ? 1 : 5;
  return roundGeofenceRadius(current + step * direction);
}
