import type { SavedPlace } from '../src/types/cue';
import type { SunlightStretch } from '../src/types/sunlight';
import {
  addStayGapRanges,
  addTrailPoints,
  getPlaceStays,
  getStretchLuxMinutes,
  getSunlightPath,
  getSunlightTimeline,
  shouldRecordTrailPoint,
} from '../src/utils/sunlight-timeline-utils';
import { mergeSunlightHistory } from '../src/utils/sunlight-utils';

const MIN = 60_000;

const place = (id: string, lat: number, lng = 105.85): SavedPlace => ({
  id,
  name: id,
  lat,
  lng,
  radiusM: 30,
  isHome: false,
});

// About 1.1 km apart.
const home = place('home', 21.03);
const cafe = place('cafe', 21.04);

const stretch = (start: number, end: number, extra: Partial<SunlightStretch> = {}): SunlightStretch => ({
  start,
  end,
  ongoing: false,
  ...extra,
});

describe('getPlaceStays', () => {
  it('follows arrivals and departures between places', () => {
    const events = [
      { ts: 0, kind: 'enter', placeId: 'home' },
      { ts: 60 * MIN, kind: 'exit', placeId: 'home' },
      { ts: 80 * MIN, kind: 'enter', placeId: 'cafe' },
    ];
    expect(getPlaceStays(events, [], [home, cafe], 0, 120 * MIN)).toEqual([
      { placeId: 'home', start: 0, end: 60 * MIN, ongoing: false },
      { placeId: 'cafe', start: 80 * MIN, end: 120 * MIN, ongoing: true },
    ]);
  });

  it('keeps one stay while position checks agree, and clips to `since`', () => {
    const samples = [
      { ts: 10 * MIN, placeId: 'home' },
      { ts: 30 * MIN, placeId: 'home' },
    ];
    expect(getPlaceStays([], samples, [home], 20 * MIN, 40 * MIN)).toEqual([
      { placeId: 'home', start: 20 * MIN, end: 40 * MIN, ongoing: true },
    ]);
  });

  it('ignores places that count as outside', () => {
    const events = [{ ts: 0, kind: 'enter', placeId: 'cafe' }];
    expect(getPlaceStays(events, [], [home], 0, 10 * MIN)).toEqual([]);
  });
});

describe('getSunlightTimeline', () => {
  it('lists stays, sessions with their light dose and pauses, newest first', () => {
    const session = stretch(60 * MIN, 80 * MIN, { eyeLux: 15_000 });
    const items = getSunlightTimeline({
      dayStart: 0,
      now: 200 * MIN,
      stretches: [session],
      stays: [
        { placeId: 'home', start: 0, end: 60 * MIN, ongoing: false },
        { placeId: 'cafe', start: 80 * MIN, end: 200 * MIN, ongoing: true },
      ],
      pauses: [{ start: 100 * MIN, end: 130 * MIN }],
    });
    expect(items.map(item => item.kind)).toEqual(['pause', 'place', 'session', 'place']);
    const sessionItem = items.find(item => item.kind === 'session');
    expect(sessionItem?.kind === 'session' && sessionItem.luxMinutes).toBe(300_000);
  });

  it('splits a stay around a session there and merges blips back together', () => {
    const items = getSunlightTimeline({
      dayStart: 0,
      now: 120 * MIN,
      stretches: [stretch(30 * MIN, 40 * MIN, { manual: true })],
      stays: [
        { placeId: 'home', start: 0, end: 70 * MIN, ongoing: false },
        // Back after a 1-minute blip that never counted.
        { placeId: 'home', start: 71 * MIN, end: 120 * MIN, ongoing: true },
      ],
      pauses: [],
    });
    const places = items.filter(item => item.kind === 'place');
    expect(places.map(item => [item.start / MIN, item.end / MIN])).toEqual([
      [40, 120],
      [0, 30],
    ]);
  });

  it('drops in-and-out stays under 2 minutes', () => {
    const items = getSunlightTimeline({
      dayStart: 0,
      now: 60 * MIN,
      stretches: [],
      stays: [{ placeId: 'cafe', start: 10 * MIN, end: 11 * MIN, ongoing: false }],
      pauses: [],
    });
    expect(items).toEqual([]);
  });
});

describe('getStretchLuxMinutes', () => {
  it('is light at the eyes times minutes, or unknown without light', () => {
    expect(getStretchLuxMinutes(stretch(0, 10 * MIN, { eyeLux: 5_000 }))).toBe(50_000);
    expect(getStretchLuxMinutes(stretch(0, 10 * MIN))).toBeUndefined();
  });
});

describe('trail', () => {
  it('records a point after moving 15 m with a good fix', () => {
    const last = { ts: 0, lat: 21.03, lng: 105.85 };
    expect(shouldRecordTrailPoint(undefined, { lat: 21.03, lng: 105.85 }, 10)).toBe(true);
    expect(shouldRecordTrailPoint(last, { lat: 21.03005, lng: 105.85 }, 10)).toBe(false);
    expect(shouldRecordTrailPoint(last, { lat: 21.0302, lng: 105.85 }, 10)).toBe(true);
    expect(shouldRecordTrailPoint(last, { lat: 21.0302, lng: 105.85 }, 80)).toBe(false);
  });

  it('rounds, sorts and drops points over a week old', () => {
    const day = 24 * 60 * MIN;
    const trail = addTrailPoints(
      [{ ts: 0, lat: 1, lng: 1 }],
      [
        { ts: 9 * day, lat: 21.0312345678, lng: 105.8512345678 },
        { ts: 8 * day, lat: 2, lng: 2 },
      ],
    );
    expect(trail).toEqual([
      { ts: 8 * day, lat: 2, lng: 2 },
      { ts: 9 * day, lat: 21.03123, lng: 105.85123 },
    ]);
  });

  it('is merged between copies of the history', () => {
    const merged = mergeSunlightHistory({ trail: [{ ts: 1, lat: 1, lng: 1 }] }, { trail: [{ ts: 2, lat: 2, lng: 2 }] });
    expect(merged.trail.map(point => point.ts)).toEqual([1, 2]);
  });
});

describe('getSunlightPath', () => {
  it('joins places and trail, solid only where time counted', () => {
    const segments = getSunlightPath({
      dayStart: 0,
      now: 120 * MIN,
      trail: [{ ts: 70 * MIN, lat: 21.035, lng: 105.85 }],
      samples: [],
      stays: [
        { placeId: 'home', start: 0, end: 60 * MIN, ongoing: false },
        { placeId: 'cafe', start: 80 * MIN, end: 120 * MIN, ongoing: true },
      ],
      places: [home, cafe],
      stretches: [{ start: 60 * MIN, end: 80 * MIN }],
    });
    expect(segments).toEqual([
      {
        counted: true,
        points: [
          { lat: 21.03, lng: 105.85 },
          { lat: 21.035, lng: 105.85 },
          { lat: 21.04, lng: 105.85 },
        ],
      },
    ]);
  });

  it('skips a coarse position check next to the trail', () => {
    const segments = getSunlightPath({
      dayStart: 0,
      now: 10 * MIN,
      trail: [
        { ts: 1 * MIN, lat: 21.03, lng: 105.85 },
        { ts: 3 * MIN, lat: 21.031, lng: 105.85 },
      ],
      samples: [{ ts: 2 * MIN, placeId: null, lat: 21.5, lng: 105.85 }],
      stays: [],
      places: [],
      stretches: [],
    });
    expect(segments).toEqual([
      {
        counted: false,
        points: [
          { lat: 21.03, lng: 105.85 },
          { lat: 21.031, lng: 105.85 },
        ],
      },
    ]);
  });
});

describe('addStayGapRanges', () => {
  const stay = (placeId: string, start: number, end: number, ongoing = false) => ({ placeId, start, end, ongoing });

  it('fills the gap between two different places', () => {
    const ranges = addStayGapRanges([], [stay('a', 0, 18 * MIN), stay('b', 21 * MIN, 40 * MIN, true)]);
    expect(ranges).toEqual([{ start: 18 * MIN, end: 21 * MIN }]);
  });

  it('only adds what is not already counted', () => {
    const ranges = addStayGapRanges(
      [{ start: 18 * MIN, end: 19 * MIN }],
      [stay('a', 0, 18 * MIN), stay('b', 25 * MIN, 40 * MIN)],
    );
    expect(ranges).toEqual([
      { start: 18 * MIN, end: 19 * MIN },
      { start: 19 * MIN, end: 25 * MIN },
    ]);
  });

  it('ignores the same place, tiny gaps and day-long gaps', () => {
    expect(addStayGapRanges([], [stay('a', 0, 10 * MIN), stay('a', 20 * MIN, 30 * MIN)])).toEqual([]);
    expect(addStayGapRanges([], [stay('a', 0, 10 * MIN), stay('b', 11 * MIN, 30 * MIN)])).toEqual([]);
    expect(addStayGapRanges([], [stay('a', 0, 10 * MIN), stay('b', 20 * 60 * MIN, 21 * 60 * MIN)])).toEqual([]);
  });
});
