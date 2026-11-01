import {
  clampGeofenceRadius,
  distanceMeters,
  findPlaceAtPoint,
  formatCoordinate,
  formatGeocodedAddress,
  radiusToSliderRatio,
  regionForGeofence,
  sliderRatioToRadius,
  stepGeofenceRadius,
} from '../src/utils/geofence-utils';

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

describe('geofence radius slider', () => {
  it('maps the ends of the slider to min and max', () => {
    expect(sliderRatioToRadius(0)).toBe(1);
    expect(sliderRatioToRadius(1)).toBe(200);
    expect(radiusToSliderRatio(1)).toBe(0);
    expect(radiusToSliderRatio(200)).toBe(1);
  });

  it('gives 10-20 m a usable share of the track', () => {
    expect(radiusToSliderRatio(20) - radiusToSliderRatio(10)).toBeGreaterThan(0.12);
  });

  it('round-trips radii', () => {
    for (const radius of [1, 7, 15, 20, 49, 50, 75, 150, 200]) {
      expect(sliderRatioToRadius(radiusToSliderRatio(radius))).toBe(radius);
    }
  });

  it('clamps old larger radii', () => {
    expect(radiusToSliderRatio(1000)).toBe(1);
    expect(clampGeofenceRadius(1000)).toBe(200);
  });

  it('steps by 1 m below 50 m and 5 m above', () => {
    expect(stepGeofenceRadius(15, 1)).toBe(16);
    expect(stepGeofenceRadius(15, -1)).toBe(14);
    expect(stepGeofenceRadius(49, 1)).toBe(50);
    expect(stepGeofenceRadius(50, 1)).toBe(55);
    expect(stepGeofenceRadius(50, -1)).toBe(49);
    expect(stepGeofenceRadius(55, -1)).toBe(50);
    expect(stepGeofenceRadius(1, -1)).toBe(1);
    expect(stepGeofenceRadius(200, 1)).toBe(200);
  });
});

describe('findPlaceAtPoint', () => {
  const cafe = { id: 'cafe', lat: 10.7769, lng: 106.7009, radiusM: 30 };
  const gym = { id: 'gym', lat: 10.7772, lng: 106.7009, radiusM: 100 };

  it('measures roughly 33 m for 0.0003 degrees of latitude', () => {
    expect(distanceMeters(cafe, gym)).toBeGreaterThan(32);
    expect(distanceMeters(cafe, gym)).toBeLessThan(35);
  });

  it('picks the closest place whose radius contains the point', () => {
    expect(findPlaceAtPoint([gym, cafe], { lat: 10.7769, lng: 106.7009 })?.id).toBe('cafe');
    expect(findPlaceAtPoint([cafe], { lat: 10.78, lng: 106.7009 })).toBeUndefined();
  });
});
