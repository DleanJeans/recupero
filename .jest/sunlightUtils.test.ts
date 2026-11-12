import type { CueActivityEvent, SavedPlace } from '../src/types/cue';
import { getSunTimesForDate } from '../src/utils/sun-utils';
import {
  estimateLux,
  getAverageLux,
  getIndoorPlaces,
  getOutdoorRanges,
  getSunlightDay,
  getSunlightGeofenceWatches,
  getSunReferencePoint,
  getWeatherUrl,
  MAX_OUTDOOR_STRETCH_MS,
  parseWeatherHours,
} from '../src/utils/sunlight-utils';

const MIN = 60_000;
const HOUR = 60 * MIN;

const place = (id: string, overrides: Partial<SavedPlace> = {}): SavedPlace => ({
  id,
  name: id,
  lat: 21.03,
  lng: 105.85,
  radiusM: 30,
  isHome: false,
  ...overrides,
});

let nextId = 0;
const event = (kind: 'enter' | 'exit', placeId: string, ts: number): CueActivityEvent => ({
  id: String(nextId++),
  kind,
  placeId,
  ts,
});

const expectNear = (actual: number | undefined, expected: number, toleranceMin = 4) => {
  expect(actual).toBeDefined();
  expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(toleranceMin * MIN);
};

describe('getSunTimesForDate', () => {
  it('matches published London times at midsummer', () => {
    const sun = getSunTimesForDate(2024, 5, 21, 51.5074, -0.1278);
    expectNear(sun.sunrise, Date.UTC(2024, 5, 21, 3, 43));
    expectNear(sun.sunset, Date.UTC(2024, 5, 21, 20, 21));
  });

  it('handles places east of Greenwich (Hanoi sunrise is the previous UTC day)', () => {
    const sun = getSunTimesForDate(2024, 11, 21, 21.0285, 105.8542);
    expectNear(sun.sunrise, Date.UTC(2024, 11, 20, 23, 30), 5);
    expectNear(sun.sunset, Date.UTC(2024, 11, 21, 10, 19), 5);
  });

  it('reports polar day and night', () => {
    expect(getSunTimesForDate(2024, 5, 21, 78.22, 15.65).polar).toBe('day');
    expect(getSunTimesForDate(2024, 11, 21, 78.22, 15.65).polar).toBe('night');
  });
});

describe('getOutdoorRanges', () => {
  const home = place('home', { isHome: true });
  const office = place('office');
  const t0 = Date.UTC(2024, 5, 21, 8);

  it('counts time between leaving one place and arriving at another', () => {
    const activity = [
      event('enter', 'home', t0),
      event('exit', 'home', t0 + HOUR),
      event('enter', 'office', t0 + HOUR + 20 * MIN),
    ];
    expect(getOutdoorRanges(activity, [], [home, office], 0, t0 + 5 * HOUR)).toEqual([
      { start: t0 + HOUR, end: t0 + HOUR + 20 * MIN },
    ]);
  });

  it('ignores flapping at the edge of a place', () => {
    const activity = [event('exit', 'home', t0), event('enter', 'home', t0 + MIN)];
    expect(getOutdoorRanges(activity, [], [home], 0, t0 + HOUR)).toEqual([]);
  });

  it('keeps counting while still out', () => {
    const activity = [event('exit', 'home', t0)];
    expect(getOutdoorRanges(activity, [], [home], 0, t0 + 30 * MIN)).toEqual([{ start: t0, end: t0 + 30 * MIN }]);
  });

  it('caps a stretch with no arrival so a missed event cannot count all day', () => {
    const activity = [event('exit', 'home', t0)];
    expect(getOutdoorRanges(activity, [], [home], 0, t0 + 12 * HOUR)).toEqual([
      { start: t0, end: t0 + MAX_OUTDOOR_STRETCH_MS },
    ]);
  });

  it('is not out while still inside an overlapping place', () => {
    const activity = [
      event('enter', 'home', t0),
      event('enter', 'office', t0 + MIN),
      event('exit', 'home', t0 + 2 * MIN),
    ];
    expect(getOutdoorRanges(activity, [], [home, office], 0, t0 + HOUR)).toEqual([]);
  });

  it('lets an app position check end a stretch when the arrival was missed', () => {
    const activity = [event('exit', 'home', t0)];
    const samples = [{ ts: t0 + 40 * MIN, placeId: 'home' }];
    expect(getOutdoorRanges(activity, samples, [home], 0, t0 + 2 * HOUR)).toEqual([{ start: t0, end: t0 + 40 * MIN }]);
  });

  it('treats places marked as outdoors as being out', () => {
    const park = place('park');
    const indoor = getIndoorPlaces([home, park], ['park']);
    const activity = [event('exit', 'home', t0), event('enter', 'park', t0 + 10 * MIN)];
    expect(getOutdoorRanges(activity, [], indoor, 0, t0 + HOUR)).toEqual([{ start: t0, end: t0 + HOUR }]);
  });

  it('counts nothing before tracking started', () => {
    const activity = [event('exit', 'home', t0)];
    expect(getOutdoorRanges(activity, [], [home], t0 + 20 * MIN, t0 + 30 * MIN)).toEqual([
      { start: t0 + 20 * MIN, end: t0 + 30 * MIN },
    ]);
  });
});

describe('getSunlightDay', () => {
  const london = { lat: 51.5074, lng: -0.1278 };
  const dayStart = new Date(2024, 5, 21).getTime();
  const sun = getSunTimesForDate(2024, 5, 21, london.lat, london.lng);

  it('only counts time between sunrise and sunset', () => {
    const sunrise = sun.sunrise as number;
    const sunset = sun.sunset as number;
    const ranges = [
      { start: sunrise - HOUR, end: sunrise + 30 * MIN },
      { start: sunset - 10 * MIN, end: sunset + HOUR },
    ];
    const day = getSunlightDay(dayStart, ranges, london, undefined, sunset + 2 * HOUR);
    expect(day.minutes).toBe(40);
    expect(day.stretches.map(stretch => stretch.end - stretch.start)).toEqual([30 * MIN, 10 * MIN]);
  });

  it('counts nothing without a location to place the sun', () => {
    const day = getSunlightDay(dayStart, [{ start: dayStart, end: dayStart + 12 * HOUR }], undefined, undefined, 0);
    expect(day.minutes).toBe(0);
  });

  it('adds weather-estimated lux', () => {
    const start = (sun.sunrise as number) + 2 * HOUR;
    const hours = [
      { ts: start + HOUR, wm2: 100 },
      { ts: start + 2 * HOUR, wm2: 500 },
    ];
    const day = getSunlightDay(
      dayStart,
      [{ start, end: start + 2 * HOUR }],
      london,
      { fetchedAt: 0, lat: 0, lng: 0, hours },
      start + 3 * HOUR,
    );
    expect(day.lux).toBeCloseTo(estimateLux(300));
  });
});

describe('weather helpers', () => {
  it('weights lux by minutes in each hour', () => {
    const hours = [
      { ts: HOUR, wm2: 0 },
      { ts: 2 * HOUR, wm2: 600 },
    ];
    expect(getAverageLux({ start: 30 * MIN, end: 2 * HOUR }, hours)).toBeCloseTo((estimateLux(600) * 2) / 3);
    expect(getAverageLux({ start: 5 * HOUR, end: 6 * HOUR }, hours)).toBeUndefined();
  });

  it('parses Open-Meteo hourly radiation', () => {
    expect(parseWeatherHours({ hourly: { time: [3600, 7200], shortwave_radiation: [12.5, null] } })).toEqual([
      { ts: 3_600_000, wm2: 12.5 },
    ]);
    expect(parseWeatherHours({})).toEqual([]);
  });

  it('sends only a rounded position', () => {
    expect(getWeatherUrl({ lat: 21.028511, lng: 105.854167 })).toContain('latitude=21.03&longitude=105.85');
  });
});

describe('places', () => {
  it('watches arrive and leave for indoor places only when on', () => {
    const places = [place('home'), place('park')];
    expect(getSunlightGeofenceWatches(true, places, ['park'])).toEqual([{ placeId: 'home', enter: true, exit: true }]);
    expect(getSunlightGeofenceWatches(false, places, [])).toEqual([]);
  });

  it('places the sun from the last checked position, then Home', () => {
    const places = [place('a', { lat: 1, lng: 2 }), place('home', { isHome: true, lat: 3, lng: 4 })];
    expect(getSunReferencePoint([], places)).toEqual({ lat: 3, lng: 4 });
    expect(getSunReferencePoint([{ ts: 1, placeId: null, lat: 5, lng: 6 }], places)).toEqual({ lat: 5, lng: 6 });
    expect(getSunReferencePoint([], [])).toBeUndefined();
  });
});
