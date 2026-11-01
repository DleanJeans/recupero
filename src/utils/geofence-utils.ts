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
