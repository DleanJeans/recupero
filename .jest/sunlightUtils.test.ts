import type { CueActivityEvent, SavedPlace } from '../src/types/cue';
import { getSunTimesForDate } from '../src/utils/sun-utils';
import {
  EYE_LEVEL_LUX_FACTOR,
  estimateLux,
  formatLuxMinutes,
  getAverageLux,
  getIndoorPlaces,
  getLightDoseTarget,
  getLuxAt,
  getLuxCurve,
  getOutdoorRanges,
  getSunlightDay,
  getSunlightGeofenceRegions,
  getSunlightPresence,
  getSunlightRegionPlaceId,
  getSunlightStatus,
  getSunReferencePoint,
  getWeatherUrl,
  MAX_OUTDOOR_STRETCH_MS,
  parseWeatherHours,
  shouldRefreshWeather,
  subtractSunlightRanges,
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

  it('drops an exit nothing confirmed when a later check finds you back at the same place', () => {
    const activity = [event('exit', 'home', t0)];
    const samples = [{ ts: t0 + 3 * HOUR, placeId: 'home' }];
    expect(getOutdoorRanges(activity, samples, [home], 0, t0 + 4 * HOUR)).toEqual([]);
  });

  it('keeps an exit a check confirmed away', () => {
    const activity = [event('exit', 'home', t0)];
    const samples = [
      { ts: t0 + 20 * MIN, placeId: null },
      { ts: t0 + HOUR, placeId: 'home' },
    ];
    expect(getOutdoorRanges(activity, samples, [home], 0, t0 + 4 * HOUR)).toEqual([{ start: t0, end: t0 + HOUR }]);
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
  it('gives indoor places their own small sunlight geofences, only when on', () => {
    const places = [place('home'), place('park')];
    expect(getSunlightGeofenceRegions(true, places, ['park'], 10)).toEqual([
      {
        identifier: 'sunlight:home',
        latitude: 21.03,
        longitude: 105.85,
        radius: 10,
        notifyOnEnter: true,
        notifyOnExit: true,
      },
    ]);
    expect(getSunlightGeofenceRegions(false, places, [], 10)).toEqual([]);
    expect(getSunlightRegionPlaceId('sunlight:home')).toBe('home');
    expect(getSunlightRegionPlaceId('home')).toBeUndefined();
  });

  it('places the sun from the last checked position, then Home', () => {
    const places = [place('a', { lat: 1, lng: 2 }), place('home', { isHome: true, lat: 3, lng: 4 })];
    expect(getSunReferencePoint([], places)).toEqual({ lat: 3, lng: 4 });
    expect(getSunReferencePoint([{ ts: 1, placeId: null, lat: 5, lng: 6 }], places)).toEqual({ lat: 5, lng: 6 });
    expect(getSunReferencePoint([], [])).toBeUndefined();
  });
});

describe('getSunlightStatus', () => {
  const london = { lat: 51.5074, lng: -0.1278 };
  const dayStart = new Date(2024, 5, 21).getTime();
  const today = getSunlightDay(dayStart, [], london, undefined, dayStart);
  const noon = (today.sunrise as number) + 6 * HOUR;
  const name = (id: string) => (id === 'home' ? 'Home' : undefined);

  it('is counting only when out while the sun is up', () => {
    expect(getSunlightStatus([], today, noon, true, name).kind).toBe('counting');
    expect(getSunlightStatus(['home'], today, noon, true, name)).toEqual({
      kind: 'indoors',
      label: 'Paused · at Home',
    });
    expect(getSunlightStatus([], today, (today.sunset as number) + HOUR, true, name).kind).toBe('sunDown');
    expect(getSunlightStatus(null, today, noon, true, name).kind).toBe('unknown');
    expect(getSunlightStatus([], today, noon, false, name).kind).toBe('off');
  });

  it('knows where you are from the last event', () => {
    const home = place('home');
    const t0 = Date.UTC(2024, 5, 21, 8);
    expect(getSunlightPresence([], [], [home], 0, t0).insidePlaceIds).toBeNull();
    expect(getSunlightPresence([event('enter', 'home', t0)], [], [home], 0, t0 + MIN).insidePlaceIds).toEqual(['home']);
    expect(getSunlightPresence([event('exit', 'home', t0)], [], [home], 0, t0 + MIN).insidePlaceIds).toEqual([]);
  });
});

describe('light dose', () => {
  it('sums eye-level lux × minutes and finds the current hour', () => {
    const london = { lat: 51.5074, lng: -0.1278 };
    const dayStart = new Date(2024, 5, 21).getTime();
    const start = (getSunTimesForDate(2024, 5, 21, london.lat, london.lng).sunrise as number) + 3 * HOUR;
    const hours = [{ ts: start + HOUR, wm2: 500 }];
    const day = getSunlightDay(
      dayStart,
      [{ start, end: start + 30 * MIN }],
      london,
      { fetchedAt: 0, lat: 0, lng: 0, hours },
      start + HOUR,
    );
    expect(day.luxMinutes).toBeCloseTo(estimateLux(500) * EYE_LEVEL_LUX_FACTOR * 30);
    expect(getLuxAt(start + 10 * MIN, hours)).toBe(estimateLux(500));
    expect(getLuxAt(start + 2 * HOUR, hours)).toBeUndefined();
    expect(getLightDoseTarget(30)).toBe(300_000);
    expect(formatLuxMinutes(1_234_567)).toBe('1.2M');
    expect(formatLuxMinutes(42_400)).toBe('42k');
  });
});

describe('weather refresh', () => {
  const point = { lat: 21.03, lng: 105.85 };
  it('refetches when the cached hours do not cover now, even if fetched recently', () => {
    const now = 10 * HOUR + 30 * MIN;
    const covered = { fetchedAt: now - MIN, lat: 21.03, lng: 105.85, hours: [{ ts: 11 * HOUR, wm2: 1 }] };
    const stale = { ...covered, hours: [{ ts: 10 * HOUR, wm2: 1 }] };
    expect(shouldRefreshWeather(covered, point, now)).toBe(false);
    expect(shouldRefreshWeather(stale, point, now)).toBe(true);
  });

  it('asks for two UTC days so the local evening and early morning are covered', () => {
    expect(getWeatherUrl(point)).toContain('forecast_days=2');
  });
});

describe('live light dose', () => {
  it('grows at the eye-level rate only while counting', () => {
    const { getLightDoseRate, getLiveLuxMinutes } = jest.requireActual('../src/utils/sunlight-utils');
    expect(getLightDoseRate(true, 8000)).toBe(4000);
    expect(getLightDoseRate(false, 8000)).toBe(0);
    expect(getLightDoseRate(true, undefined)).toBe(0);
    expect(getLiveLuxMinutes(5000, 4000, 0, 15_000)).toBe(6000);
    expect(getLiveLuxMinutes(5000, 4000, 1000, 0)).toBe(5000);
  });
});

describe('getSunlightNotificationPlan', () => {
  const { getSunlightNotificationPlan } = jest.requireActual('../src/utils/sunlight-utils');
  const london = { lat: 51.5074, lng: -0.1278 };
  const dayStart = new Date(2024, 5, 21).getTime();
  const sun = getSunTimesForDate(2024, 5, 21, london.lat, london.lng);
  const noon = (sun.sunrise as number) + 6 * HOUR;
  const today = getSunlightDay(dayStart, [], london, undefined, noon);
  const weather = {
    fetchedAt: 0,
    lat: 0,
    lng: 0,
    hours: [
      { ts: noon - 10 * MIN, wm2: 100 },
      { ts: noon + 50 * MIN, wm2: 400 },
      { ts: noon + 110 * MIN, wm2: 500 },
    ],
  };

  it('plans a notification while out in daylight, with hourly rates from now and a stop at the cap', () => {
    const plan = getSunlightNotificationPlan(
      { insidePlaceIds: [], outSince: noon - 5 * MIN },
      today,
      30,
      weather,
      noon,
    );
    expect(plan).toMatchObject({ target: 300_000, outSince: noon - 5 * MIN, snapshotAt: noon });
    // 10-minute steps along the blended curve, ending where the weather does (noon + 110 min).
    expect(plan.rates).toHaveLength(11);
    expect(plan.rates[0]).toEqual({ until: noon + 10 * MIN, perMinute: estimateLux(325) / 2 });
    expect(plan.rates[10].until).toBe(noon + 110 * MIN);
    expect(plan.stopAt).toBe(Math.min(sun.sunset as number, noon - 5 * MIN + MAX_OUTDOOR_STRETCH_MS));
  });

  it('shows nothing indoors, before the first event or after sunset', () => {
    expect(getSunlightNotificationPlan({ insidePlaceIds: ['home'] }, today, 30, weather, noon)).toBeNull();
    expect(getSunlightNotificationPlan({ insidePlaceIds: null }, today, 30, weather, noon)).toBeNull();
    const late = (sun.sunset as number) + MIN;
    expect(
      getSunlightNotificationPlan({ insidePlaceIds: [], outSince: late - HOUR }, today, 30, weather, late),
    ).toBeNull();
  });
});

describe('blended lux and calibration', () => {
  const { getLuxAt: luxAt, calibrateWeather, getLuxCalibration } = jest.requireActual('../src/utils/sunlight-utils');
  const hours = [
    { ts: HOUR, wm2: 0 },
    { ts: 2 * HOUR, wm2: 600 },
  ];

  it('places each hourly average mid-hour and blends between them', () => {
    expect(luxAt(10 * MIN, hours)).toBe(0);
    expect(luxAt(HOUR, hours)).toBeCloseTo(estimateLux(300));
    expect(luxAt(100 * MIN, hours)).toBe(estimateLux(600));
    expect(luxAt(2 * HOUR + MIN, hours)).toBeUndefined();
  });

  it('scales the weather to a meter reading', () => {
    expect(getLuxCalibration(4500, 11_000)).toBeCloseTo(0.409, 3);
    expect(getLuxCalibration(0, 11_000)).toBeUndefined();
    expect(getLuxCalibration(1_000_000, 100)).toBe(5);
    const weather = { fetchedAt: 0, lat: 0, lng: 0, hours };
    expect(calibrateWeather(weather, [])).toBe(weather);
    expect(calibrateWeather(weather, [{ from: 0, factor: 0.5 }])?.calibration).toEqual([{ from: 0, factor: 0.5 }]);
  });

  it('applies a calibration only from when it was made, so earlier time keeps its factor', () => {
    const { getCalibrationFactorAt, addCalibrationStep } = jest.requireActual('../src/utils/sunlight-utils');
    const steps = addCalibrationStep(addCalibrationStep([], 10 * HOUR, 0.5), 20 * HOUR, 1);
    expect(getCalibrationFactorAt(steps, 5 * HOUR)).toBe(1);
    expect(getCalibrationFactorAt(steps, 10 * HOUR)).toBe(0.5);
    expect(getCalibrationFactorAt(steps, 15 * HOUR)).toBe(0.5);
    expect(getCalibrationFactorAt(steps, 25 * HOUR)).toBe(1);
    expect(addCalibrationStep(steps, 10 * HOUR, 0.7)).toHaveLength(2);
    // Before the calibration the estimate is plain; after it, scaled.
    const wide = [{ ts: 24 * HOUR, wm2: 600 }];
    expect(luxAt(9 * HOUR, wide, steps)).toBeUndefined();
    const flat = Array.from({ length: 24 }, (_, i) => ({ ts: (i + 1) * HOUR, wm2: 600 }));
    expect(luxAt(5 * HOUR, flat, steps)).toBeCloseTo(estimateLux(600));
    expect(luxAt(15 * HOUR, flat, steps)).toBeCloseTo(estimateLux(600) * 0.5);
  });
});

describe('subtractSunlightRanges', () => {
  it('cuts a deleted stretch out of the ranges', () => {
    const ranges = [
      { start: 0, end: 100 },
      { start: 200, end: 300 },
    ];
    expect(subtractSunlightRanges(ranges, [{ start: 200, end: 300 }])).toEqual([{ start: 0, end: 100 }]);
    expect(subtractSunlightRanges(ranges, [{ start: 40, end: 60 }])).toEqual([
      { start: 0, end: 40 },
      { start: 60, end: 100 },
      { start: 200, end: 300 },
    ]);
  });
});

describe('manual sessions', () => {
  const { getSunlightDay: day, getRunningManualSession } = jest.requireActual('../src/utils/sunlight-utils');
  const london = { lat: 51.5, lng: -0.12 };
  const dayStart = new Date(2026, 5, 21).getTime();
  const noon = dayStart + 12 * HOUR;

  it('counts a manual session inside daylight with its own lux and dose', () => {
    const result = day(dayStart, [], london, undefined, noon + HOUR, [
      { start: noon, end: noon + 30 * 60_000, lux: 8000 },
    ]);
    expect(result.minutes).toBe(30);
    expect(result.stretches[0]).toMatchObject({ manual: true, lux: 8000, ongoing: false });
    expect(result.luxMinutes).toBe(8000 * 30);
  });

  it('keeps a running session ongoing and replaces overlapping auto time', () => {
    const result = day(
      dayStart,
      [{ start: noon - HOUR, end: noon + 20 * 60_000 }],
      london,
      undefined,
      noon + 20 * 60_000,
      [{ start: noon, lux: 5000 }],
    );
    // 60 min auto before the session + 20 min manual, nothing counted twice.
    expect(result.minutes).toBe(80);
    expect(result.stretches.at(-1)).toMatchObject({ manual: true, ongoing: true });
    expect(getRunningManualSession([{ start: noon, lux: 5000 }], noon + 1000)).toBeDefined();
  });
});

describe('mergeSunlightHistory', () => {
  const { mergeSunlightHistory } = jest.requireActual('../src/utils/sunlight-utils');
  it('keeps events either copy saved, without duplicates', () => {
    const exit = { ts: 1, kind: 'exit', placeId: 'home' };
    const enter = { ts: 5, kind: 'enter', placeId: 'work' };
    const merged = mergeSunlightHistory(
      { events: [exit] },
      { events: [exit, enter], samples: [{ ts: 3, placeId: null }] },
    );
    expect(merged.events).toEqual([exit, enter]);
    expect(merged.samples).toHaveLength(1);
  });
  it('prefers a stopped manual session and drops deleted ones', () => {
    const merged = mergeSunlightHistory(
      {
        manualSessions: [
          { start: 1, end: 9, lux: 5 },
          { start: 20, lux: 5 },
        ],
      },
      {
        manualSessions: [
          { start: 1, lux: 5 },
          { start: 20, lux: 5 },
        ],
        deletedManualStarts: [20],
      },
    );
    expect(merged.manualSessions).toEqual([{ start: 1, end: 9, lux: 5 }]);
  });

  it('keeps pauses from both copies', () => {
    const a = { start: 1, end: 5 };
    const b = { start: 9, end: 12 };
    expect(mergeSunlightHistory({ pauses: [a] }, { pauses: [a, b] }).pauses).toEqual([a, b]);
  });
});

describe('manual pause', () => {
  const {
    getActivePause,
    getPausedRanges,
    getPauseUntil,
    formatPauseUntil,
    SUNLIGHT_PAUSE_OPTIONS,
    subtractSunlightRanges: subtract,
    getSunlightNotificationPlan,
  } = jest.requireActual('../src/utils/sunlight-utils');
  const t0 = new Date(2024, 5, 21, 10, 0).getTime();

  it('ends after the chosen minutes or at the end of the day', () => {
    expect(getPauseUntil(SUNLIGHT_PAUSE_OPTIONS[1], t0)).toBe(t0 + HOUR);
    expect(getPauseUntil(SUNLIGHT_PAUSE_OPTIONS[3], t0)).toBe(new Date(2024, 5, 22).getTime());
  });

  it('is active only between its start and end', () => {
    const pause = { start: t0, until: t0 + HOUR };
    expect(getActivePause(pause, t0 + 30 * MIN)).toBe(pause);
    expect(getActivePause(pause, t0 + HOUR)).toBeUndefined();
    expect(getActivePause(undefined, t0)).toBeUndefined();
  });

  it('keeps the time before the pause and counts again once it ends', () => {
    const out = [{ start: t0 - HOUR, end: t0 + 3 * HOUR }];
    const cuts = getPausedRanges([], { start: t0, until: t0 + HOUR });
    expect(subtract(out, cuts)).toEqual([
      { start: t0 - HOUR, end: t0 },
      { start: t0 + HOUR, end: t0 + 3 * HOUR },
    ]);
    // Resumed early: the finished pause is shorter.
    expect(subtract(out, getPausedRanges([{ start: t0, end: t0 + 10 * MIN }], undefined))).toEqual([
      { start: t0 - HOUR, end: t0 },
      { start: t0 + 10 * MIN, end: t0 + 3 * HOUR },
    ]);
  });

  it('words the end of a pause', () => {
    const time = () => '11:00 AM';
    expect(formatPauseUntil(t0 + HOUR, t0, time)).toBe('until 11:00 AM');
    expect(formatPauseUntil(new Date(2024, 5, 22).getTime(), t0, time)).toBe('until tomorrow');
  });

  it('puts the pause in the notification plan: numbers stand still, counting restarts after it', () => {
    const london = { lat: 51.5074, lng: -0.1278 };
    const sun = getSunTimesForDate(2024, 5, 21, london.lat, london.lng);
    const noon = (sun.sunrise as number) + 6 * HOUR;
    const today = getSunlightDay(new Date(2024, 5, 21).getTime(), [], london, undefined, noon);
    const presence = { insidePlaceIds: [], outSince: noon - HOUR };
    const plan = getSunlightNotificationPlan(presence, today, 30, undefined, noon, noon + HOUR);
    expect(plan).toMatchObject({ pausedUntil: noon + HOUR, snapshotAt: noon + HOUR, outSince: noon + HOUR });
    // Not paused (or the pause already ran out): the plan is the usual one.
    expect(getSunlightNotificationPlan(presence, today, 30, undefined, noon, noon)).toMatchObject({
      snapshotAt: noon,
      outSince: noon - HOUR,
    });
    expect(getSunlightNotificationPlan(presence, today, 30, undefined, noon)).not.toHaveProperty('pausedUntil');
  });
});

describe('edited sessions', () => {
  const {
    getSunlightDay: day,
    getSessionEditError,
    getFreeSessionStart,
  } = jest.requireActual('../src/utils/sunlight-utils');
  const london = { lat: 51.5, lng: -0.12 };
  const dayStart = new Date(2026, 5, 21).getTime();
  const noon = dayStart + 12 * HOUR;
  it('shows an edited session with no fixed lux as edited, without double counting', () => {
    const result = day(dayStart, [{ start: noon, end: noon + HOUR }], london, undefined, noon + 2 * HOUR, [
      { start: noon + 10 * 60_000, end: noon + 40 * 60_000, edited: true },
    ]);
    expect(result.stretches.find((stretch: { edited?: boolean }) => stretch.edited)).toMatchObject({ lux: undefined });
    expect(result.minutes).toBe(60);
  });
  it('validates times and avoids deleted starts', () => {
    expect(getSessionEditError(10, 5, 100)).toBeDefined();
    expect(getSessionEditError(10, 200, 100)).toBeDefined();
    expect(getSessionEditError(10, 50, 100)).toBeUndefined();
    expect(getFreeSessionStart(5, [5, 6])).toBe(7);
  });
});

describe('trip between far places with no departure seen', () => {
  const { getSunlightPresence: presence } = jest.requireActual('../src/utils/sunlight-utils');
  const home = place('home', { isHome: true });
  const shop = place('shop', { lat: 21.04 });
  const t0 = Date.UTC(2024, 5, 21, 2);
  it('counts from the last sighting at the shop to the first at home', () => {
    const result = presence(
      [event('enter', 'shop', t0 + 1000)],
      [
        { ts: t0, placeId: 'shop' },
        { ts: t0 + 10 * MIN, placeId: 'home' },
      ],
      [home, shop],
      0,
      t0 + HOUR,
    );
    expect(result.ranges).toEqual([{ start: t0 + 1000, end: t0 + 10 * MIN }]);
    expect(result.insidePlaceIds).toEqual(['home']);
  });
  it('does not invent a trip between overlapping places', () => {
    const room = place('room', { lat: 21.0301 });
    const result = presence(
      [],
      [
        { ts: t0, placeId: 'home' },
        { ts: t0 + 10 * MIN, placeId: 'room' },
      ],
      [home, room],
      0,
      t0 + HOUR,
    );
    expect(result.ranges).toEqual([]);
  });
});

describe('bursts and wobble', () => {
  const { dropGeofenceBursts, getSunlightPresence: presence } = jest.requireActual('../src/utils/sunlight-utils');
  const t0 = Date.UTC(2024, 5, 21, 2);
  it('drops a re-registration burst across many places but keeps a lone exit', () => {
    const burst = ['a', 'b', 'c', 'd'].map((id, i) => ({ ts: t0 + i * 200, kind: 'exit', placeId: id }));
    const lone = { ts: t0 + HOUR, kind: 'exit', placeId: 'a' };
    expect(dropGeofenceBursts([...burst, lone])).toEqual([lone]);
  });
  it('ignores a borderline away fix that the next check contradicts', () => {
    const home = place('home', { isHome: true });
    const result = presence(
      [],
      [
        { ts: t0, placeId: 'home' },
        { ts: t0 + 10 * MIN, placeId: null, edgeM: 8, accuracyM: 12 },
        { ts: t0 + 13 * MIN, placeId: 'home' },
      ],
      [home],
      0,
      t0 + HOUR,
    );
    expect(result.ranges).toEqual([]);
  });
  it('still counts a clear trip out', () => {
    const home = place('home', { isHome: true });
    const result = presence(
      [],
      [
        { ts: t0, placeId: 'home' },
        { ts: t0 + 10 * MIN, placeId: null, edgeM: 120, accuracyM: 8 },
        { ts: t0 + 30 * MIN, placeId: 'home' },
      ],
      [home],
      0,
      t0 + HOUR,
    );
    expect(result.ranges).toHaveLength(1);
  });
});

describe('eye-level lux on sessions', () => {
  const { getSunlightDay: day } = jest.requireActual('../src/utils/sunlight-utils');
  it('applies the eye-level share to a detected session and not to a manual one', () => {
    const london = { lat: 51.5, lng: -0.12 };
    const dayStart = new Date(2026, 5, 21).getTime();
    const noon = dayStart + 12 * HOUR;
    const hours = Array.from({ length: 24 }, (_, i) => ({ ts: dayStart + (i + 1) * HOUR, wm2: 500 }));
    const weather = { fetchedAt: 0, lat: 51.5, lng: -0.12, hours, eyeLevel: [{ from: 0, factor: 0.4 }] };
    const result = day(dayStart, [{ start: noon, end: noon + 30 * MIN }], london, weather, noon + 2 * HOUR, [
      { start: noon + HOUR, end: noon + HOUR + 10 * MIN, lux: 3000 },
    ]);
    expect(result.stretches[0].lux).toBeCloseTo(60_000);
    expect(result.stretches[0].eyeLux).toBeCloseTo(24_000);
    expect(result.stretches[1].eyeLux).toBe(3000);
  });
});

describe('isUsableSunlightFix', () => {
  const { isUsableSunlightFix } = jest.requireActual('../src/utils/sunlight-utils');
  it('accepts a vague fix only when it is clearly away from every place', () => {
    expect(isUsableSunlightFix({ placeId: 'home' }, 30)).toBe(true);
    expect(isUsableSunlightFix({ placeId: null, edgeM: 400 }, 150)).toBe(true);
    expect(isUsableSunlightFix({ placeId: null, edgeM: 80 }, 150)).toBe(false);
    expect(isUsableSunlightFix({ placeId: 'home' }, 150)).toBe(false);
  });
});

import { getSunlightPinGeofenceRegions, hasLeftPausePin } from '../src/utils/sunlight-utils';

describe('pause pin', () => {
  const pin = { lat: 10, lng: 106 };

  it('registers an exit-only geofence while a pinned pause is active', () => {
    const regions = getSunlightPinGeofenceRegions({ start: 0, until: 1000, pin }, 30, 500);
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({
      latitude: 10,
      longitude: 106,
      radius: 30,
      notifyOnExit: true,
      notifyOnEnter: false,
    });
    expect(getSunlightPinGeofenceRegions({ start: 0, until: 1000, pin }, 30, 2000)).toEqual([]);
    expect(getSunlightPinGeofenceRegions({ start: 0, until: 1000 }, 30, 500)).toEqual([]);
  });

  it('ends only when the fix centre is outside the radius', () => {
    expect(hasLeftPausePin(pin, { lat: 10, lng: 106 }, 30, 10)).toBe(false);
    expect(hasLeftPausePin(pin, { lat: 10.001, lng: 106 }, 30, 10)).toBe(true);
    expect(hasLeftPausePin(pin, { lat: 10.0004, lng: 106 }, 30, 300)).toBe(false);
  });
});

describe('getLuxCurve', () => {
  const hour = 3_600_000;
  const hours = Array.from({ length: 24 }, (_, i) => ({ ts: (i + 1) * hour, wm2: i >= 6 && i < 18 ? 500 : 0 }));
  it('is empty without sun times or weather', () => {
    expect(getLuxCurve(undefined, undefined, hours, undefined, [])).toEqual([]);
    expect(getLuxCurve(6 * hour, 18 * hour, [], undefined, [])).toEqual([]);
  });
  it('slices sunrise to sunset and marks outside time', () => {
    const points = getLuxCurve(6 * hour, 18 * hour, hours, undefined, [{ start: 6 * hour, end: 9 * hour }], 12);
    expect(points).toHaveLength(12);
    expect(points[0].out).toBe(true);
    expect(points[11].out).toBe(false);
    expect(points[5].lux).toBeGreaterThan(0);
  });
});
