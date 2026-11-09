import type { LogEntry } from '../src/types/behavior';
import type { HealthSleep } from '../src/types/health';
import {
  filterBehaviorsByName,
  getAzmGoalDaysThisWeek,
  getAzmRollUpBody,
  getAzmWeekTotal,
  getGoogleRedirectScheme,
  getHealthSyncStart,
  getSleepBehaviorChoices,
  getSleepFilter,
  MAX_IMPORTED_SLEEP_IDS,
  mergeAzmDays,
  mergeSleepIntoLogs,
  parseAzmRollupPoint,
  parseSleepDataPoint,
} from '../src/utils/google-health-utils';
import { getRefillEvent } from '../src/utils/need-utils';

const DAY = 86_400_000;

describe('getGoogleRedirectScheme', () => {
  it('reverses an iOS-type client id', () => {
    expect(getGoogleRedirectScheme('123-abc.apps.googleusercontent.com')).toBe('com.googleusercontent.apps.123-abc');
  });
  it('rejects other ids', () => {
    expect(getGoogleRedirectScheme('nope')).toBeUndefined();
  });
});

describe('getHealthSyncStart', () => {
  const now = Date.UTC(2026, 10, 9);
  it('reads a week the first time', () => {
    expect(getHealthSyncStart(undefined, now)).toBe(now - 7 * DAY);
  });
  it('re-reads two days before the last sync', () => {
    expect(getHealthSyncStart(now - DAY, now)).toBe(now - 3 * DAY);
  });
  it('never reads more than a week', () => {
    expect(getHealthSyncStart(now - 30 * DAY, now)).toBe(now - 7 * DAY);
  });
});

describe('getSleepFilter', () => {
  it('uses RFC 3339 without milliseconds', () => {
    expect(getSleepFilter(Date.UTC(2026, 10, 2, 5))).toBe('sleep.interval.end_time >= "2026-11-02T05:00:00Z"');
  });
});

describe('parseSleepDataPoint', () => {
  const point = {
    name: 'users/me/dataTypes/sleep/dataPoints/42',
    sleep: {
      interval: { startTime: '2026-11-08T16:00:00Z', endTime: '2026-11-09T00:00:00Z' },
      type: 'STAGES',
      summary: {
        minutesAsleep: '440',
        minutesAwake: '40',
        stagesSummary: [
          { type: 'DEEP', minutes: '80', count: '4' },
          { type: 'LIGHT', minutes: '260', count: '20' },
          { type: 'REM', minutes: '100', count: '5' },
          { type: 'AWAKE', minutes: '40', count: '18' },
        ],
      },
    },
  };

  it('reads times, minutes asleep and stages (int64 strings)', () => {
    expect(parseSleepDataPoint(point)).toEqual({
      id: 'users/me/dataTypes/sleep/dataPoints/42',
      start: Date.UTC(2026, 10, 8, 16),
      end: Date.UTC(2026, 10, 9),
      asleepMinutes: 440,
      awakeMinutes: 40,
      deepMinutes: 80,
      lightMinutes: 260,
      remMinutes: 100,
    });
  });

  it('falls back to the whole span when there is no summary', () => {
    const parsed = parseSleepDataPoint({ ...point, sleep: { interval: point.sleep.interval } });
    expect(parsed?.asleepMinutes).toBe(480);
  });

  it('skips points without times', () => {
    expect(parseSleepDataPoint({ name: 'x', sleep: {} })).toBeUndefined();
    expect(parseSleepDataPoint(null)).toBeUndefined();
  });
});

describe('Active Zone Minutes roll-up', () => {
  it('builds a closed-open civil range', () => {
    expect(getAzmRollUpBody('2026-11-02', '2026-11-09')).toEqual({
      range: {
        start: { date: { year: 2026, month: 11, day: 2 }, time: {} },
        end: { date: { year: 2026, month: 11, day: 10 }, time: {} },
      },
      windowSizeDays: 1,
    });
  });

  it('sums fat burn, cardio and peak', () => {
    expect(
      parseAzmRollupPoint({
        civilStartTime: { date: { year: 2026, month: 11, day: 8 } },
        activeZoneMinutes: { sumInFatBurnHeartZone: '10', sumInCardioHeartZone: '8', sumInPeakHeartZone: '2' },
      }),
    ).toEqual({ day: '2026-11-08', minutes: 20 });
  });

  it('skips points without a date', () => {
    expect(parseAzmRollupPoint({ activeZoneMinutes: {} })).toBeUndefined();
  });

  it('replaces synced days and keeps older ones', () => {
    const now = new Date(2026, 10, 9, 12).getTime();
    const merged = mergeAzmDays(
      { '2026-11-01': 30, '2026-11-07': 5, '2026-11-08': 9, '2026-08-01': 50 },
      [{ day: '2026-11-08', minutes: 25 }],
      '2026-11-07',
      now,
    );
    expect(merged).toEqual({ '2026-11-01': 30, '2026-11-08': 25 });
  });

  it('totals the week and counts days that met the goal', () => {
    const now = new Date(2026, 10, 9, 12).getTime();
    const byDay = { '2026-11-09': 22, '2026-11-08': 30, '2026-11-05': 10, '2026-11-02': 99 };
    expect(getAzmWeekTotal(byDay, now)).toBe(62);
    expect(getAzmGoalDaysThisWeek(byDay, 22, now)).toBe(2);
  });
});

describe('mergeSleepIntoLogs', () => {
  let n = 0;
  const createId = () => `log-${++n}`;
  const sleep: HealthSleep = {
    id: 'sleep-1',
    start: Date.UTC(2026, 10, 8, 16),
    end: Date.UTC(2026, 10, 9),
    asleepMinutes: 420,
    awakeMinutes: 60,
  };

  beforeEach(() => {
    n = 0;
  });

  it('adds a new sleep as a google-health log', () => {
    const result = mergeSleepIntoLogs([], [sleep], [], createId);
    expect(result.changed).toBe(true);
    expect(result.importedIds).toEqual(['sleep-1']);
    expect(result.logs).toEqual([
      {
        id: 'log-1',
        timestamp: sleep.start,
        endTimestamp: sleep.end,
        metadata: {},
        source: 'google-health',
        externalId: 'sleep-1',
        sleep: { asleepMinutes: 420, awakeMinutes: 60 },
      },
    ]);
  });

  it('does nothing when the same sleep syncs again', () => {
    const first = mergeSleepIntoLogs([], [sleep], [], createId);
    const second = mergeSleepIntoLogs(first.logs, [sleep], first.importedIds, createId);
    expect(second.changed).toBe(false);
    expect(second.logs).toBe(first.logs);
  });

  it('updates the log when Fitbit edits the sleep', () => {
    const first = mergeSleepIntoLogs([], [sleep], [], createId);
    const edited = { ...sleep, end: sleep.end + 30 * 60_000, asleepMinutes: 450 };
    const second = mergeSleepIntoLogs(first.logs, [edited], first.importedIds, createId);
    expect(second.changed).toBe(true);
    expect(second.logs).toHaveLength(1);
    expect(second.logs[0]).toMatchObject({ id: 'log-1', endTimestamp: edited.end, sleep: { asleepMinutes: 450 } });
  });

  it('does not bring back a log the user deleted', () => {
    const result = mergeSleepIntoLogs([], [sleep], ['sleep-1'], createId);
    expect(result.changed).toBe(false);
    expect(result.logs).toEqual([]);
  });

  it('skips a sleep a manual log already covers', () => {
    const manual: LogEntry = {
      id: 'manual',
      timestamp: sleep.start + 30 * 60_000,
      endTimestamp: sleep.end - 15 * 60_000,
      metadata: {},
    };
    const result = mergeSleepIntoLogs([manual], [sleep], [], createId);
    expect(result.logs).toEqual([manual]);
    expect(result.importedIds).toEqual(['sleep-1']);
  });

  it('keeps the imported id list bounded', () => {
    const ids = Array.from({ length: MAX_IMPORTED_SLEEP_IDS }, (_, i) => `old-${i}`);
    const result = mergeSleepIntoLogs([], [sleep], ids, createId);
    expect(result.importedIds).toHaveLength(MAX_IMPORTED_SLEEP_IDS);
    expect(result.importedIds.at(-1)).toBe('sleep-1');
  });
});

describe('Energy refill from synced sleep', () => {
  it('counts time asleep, not time in bed', () => {
    const log: LogEntry = {
      id: 'l',
      timestamp: 0,
      endTimestamp: 8 * 3_600_000,
      source: 'google-health',
      sleep: { asleepMinutes: 360 },
    };
    const event = getRefillEvent('b', log, { mode: 'duration', fullMinutes: 480 }, undefined);
    expect(event).toMatchObject({ kind: 'add', amount: 75, ts: 8 * 3_600_000 });
  });
});

describe('getSleepBehaviorChoices', () => {
  it('puts sleep-like names first and hides archived', () => {
    const choices = getSleepBehaviorChoices([
      { id: '1', name: 'Coffee' },
      { id: '2', name: 'Nap' },
      { id: '3', name: 'Sleep', archivedAt: 1 },
      { id: '4', name: 'Go to bed' },
    ]);
    expect(choices.map(choice => choice.id)).toEqual(['4', '2', '1']);
  });
});

describe('filterBehaviorsByName', () => {
  const behaviors = [{ name: 'Nap' }, { name: 'Napa Cabbage / Cải thảo' }, { name: 'Phone in Bed' }];
  it('matches any part of the name, ignoring case', () => {
    expect(filterBehaviorsByName(behaviors, ' BED ')).toEqual([{ name: 'Phone in Bed' }]);
    expect(filterBehaviorsByName(behaviors, 'nap')).toHaveLength(2);
  });
  it('returns everything for a blank query', () => {
    expect(filterBehaviorsByName(behaviors, '  ')).toBe(behaviors);
  });
});
