import { formatCoordinate, formatGeocodedAddress, regionForGeofence } from '../src/utils/geofence-utils';

describe('geofence utils', () => {
  it('fits the geofence circle with padding', () => {
    const region = regionForGeofence({ lat: 0, lng: 10 }, 500);
    expect(region.latitude).toBe(0);
    expect(region.longitude).toBe(10);
    expect(region.latitudeDelta).toBeCloseTo(3000 / 111_320);
    expect(region.longitudeDelta).toBeCloseTo(region.latitudeDelta);
  });

  it('keeps a minimum span for small radii and widens longitude away from the equator', () => {
    const region = regionForGeofence({ lat: 60, lng: 0 }, 10);
    expect(region.latitudeDelta).toBeCloseTo(150 / 111_320);
    expect(region.longitudeDelta).toBeCloseTo(region.latitudeDelta * 2);
  });

  it('formats a reverse-geocoded address without repeating the street', () => {
    expect(
      formatGeocodedAddress({
        name: '12',
        streetNumber: '12',
        street: 'Main St',
        district: 'Old Town',
        city: 'Springfield',
      }),
    ).toBe('12 Main St, Old Town');
    expect(formatGeocodedAddress({ name: 'City Gym', street: 'Main St', city: 'Springfield' })).toBe(
      'City Gym, Main St, Springfield',
    );
  });

  it('falls back to the formatted address or country', () => {
    expect(formatGeocodedAddress({ formattedAddress: 'Somewhere 1, X' })).toBe('Somewhere 1, X');
    expect(formatGeocodedAddress({ country: 'Vietnam' })).toBe('Vietnam');
  });

  it('formats coordinates to 5 decimals', () => {
    expect(formatCoordinate({ lat: 10.123456, lng: 106.987654 })).toBe('10.12346, 106.98765');
  });
});
