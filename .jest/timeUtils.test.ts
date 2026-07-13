import {
  formatCooldown,
  formatDuration,
  formatElapsed,
  formatElapsedNumeric,
  formatElapsedText,
  formatTimeRange,
} from '../src/utils/time-utils';

describe('formatCooldown', () => {
  it('returns empty string for 0 or negative or NaN', () => {
    expect(formatCooldown(0)).toBe('');
    expect(formatCooldown(-5)).toBe('');
    expect(formatCooldown(NaN)).toBe('');
  });

  it('returns "X min" for < 60 minutes', () => {
    expect(formatCooldown(30)).toBe('30 min');
    expect(formatCooldown(1)).toBe('1 min');
    expect(formatCooldown(59)).toBe('59 min');
  });

  it('returns "Xh" for 60-1439 minutes', () => {
    expect(formatCooldown(60)).toBe('1h');
    expect(formatCooldown(120)).toBe('2h');
    expect(formatCooldown(480)).toBe('8h');
  });

  it('returns "Xd" for 1440-10079 minutes', () => {
    expect(formatCooldown(1440)).toBe('1d');
    expect(formatCooldown(2880)).toBe('2d');
    expect(formatCooldown(7200)).toBe('5d');
  });

  it('returns "Xw" for 10080+ minutes', () => {
    expect(formatCooldown(10080)).toBe('1w');
    expect(formatCooldown(20160)).toBe('2w');
    expect(formatCooldown(40320)).toBe('4w');
  });
});

describe('formatTimeRange', () => {
  it('formats a single timestamp when no end time is provided', () => {
    const ts = new Date(2026, 5, 20, 9, 5, 0).getTime();
    expect(formatTimeRange(ts, undefined, false)).toBe('09:05');
  });

  it('formats a start and end timestamp when both are provided', () => {
    const start = new Date(2026, 5, 20, 9, 5, 0).getTime();
    const end = new Date(2026, 5, 20, 9, 35, 0).getTime();
    expect(formatTimeRange(start, end, false)).toBe('09:05 - 09:35');
  });

  it('includes seconds for precise time ranges', () => {
    const start = new Date(2026, 5, 20, 9, 5, 30).getTime();
    const end = new Date(2026, 5, 20, 9, 35, 45).getTime();
    expect(formatTimeRange(start, end, false, true)).toBe('09:05:30 - 09:35:45');
    expect(formatTimeRange(start, end, false)).toBe('09:05 - 09:35');
  });
});

describe('formatElapsedText', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(2026, 5, 20, 14, 30, 0) });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns empty string for null', () => {
    expect(formatElapsedText(null)).toBe('');
  });

  it('returns empty string for < 1 hour', () => {
    expect(formatElapsedText(Date.now() - 30_000)).toBe('');
    expect(formatElapsedText(Date.now() - 30 * 60_000)).toBe('');
  });

  it('returns "Today" for same calendar day', () => {
    expect(formatElapsedText(Date.now() - 3 * 3600_000)).toBe('Today');
    expect(formatElapsedText(Date.now() - 10 * 3600_000)).toBe('Today');
  });

  it('returns "Yesterday" for previous calendar day', () => {
    expect(formatElapsedText(Date.now() - 24 * 3600_000)).toBe('Yesterday');
    expect(formatElapsedText(Date.now() - 30 * 3600_000)).toBe('Yesterday');
  });

  it('returns day name for 2-6 days ago', () => {
    expect(formatElapsedText(Date.now() - 2 * 24 * 3600_000)).toBe('Thursday');
    expect(formatElapsedText(Date.now() - 5 * 24 * 3600_000)).toBe('Monday');
    expect(formatElapsedText(Date.now() - 6 * 24 * 3600_000)).toBe('Sunday');
  });

  it('returns "Last Week" for 7-13 days ago (same month)', () => {
    expect(formatElapsedText(Date.now() - 7 * 24 * 3600_000)).toBe('Last Week');
    expect(formatElapsedText(Date.now() - 10 * 24 * 3600_000)).toBe('Last Week');
    expect(formatElapsedText(Date.now() - 13 * 24 * 3600_000)).toBe('Last Week');
  });

  it('returns "Last Month" for events in previous calendar month', () => {
    expect(formatElapsedText(Date.now() - 21 * 24 * 3600_000)).toBe('Last Month');
    expect(formatElapsedText(Date.now() - 30 * 24 * 3600_000)).toBe('Last Month');
  });

  it('returns empty string for 14+ days not in last month or last year', () => {
    expect(formatElapsedText(Date.now() - 14 * 24 * 3600_000)).toBe('');
    expect(formatElapsedText(Date.now() - 56 * 24 * 3600_000)).toBe('');
    expect(formatElapsedText(Date.now() - 90 * 24 * 3600_000)).toBe('');
  });

  it('returns "Last Year" for events in previous calendar year', () => {
    expect(formatElapsedText(Date.now() - 330 * 24 * 3600_000)).toBe('Last Year');
    expect(formatElapsedText(Date.now() - 200 * 24 * 3600_000)).toBe('Last Year');
  });

  it('returns empty string for 365+ days', () => {
    expect(formatElapsedText(Date.now() - 365 * 24 * 3600_000)).toBe('');
    expect(formatElapsedText(Date.now() - 730 * 24 * 3600_000)).toBe('');
  });
});

describe('formatElapsedNumeric', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(2026, 5, 20, 14, 30, 0) });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns "Never" for null', () => {
    expect(formatElapsedNumeric(null)).toBe('Never');
  });

  it('returns "Just now" within 60 seconds', () => {
    expect(formatElapsedNumeric(Date.now() - 30_000)).toBe('Just now');
    expect(formatElapsedNumeric(Date.now())).toBe('Just now');
  });

  it('returns "Xm ago" for < 1 hour', () => {
    expect(formatElapsedNumeric(Date.now() - 5 * 60_000)).toBe('5m ago');
    expect(formatElapsedNumeric(Date.now() - 59 * 60_000)).toBe('59m ago');
  });

  it('includes remaining minutes in hours', () => {
    expect(formatElapsedNumeric(Date.now() - 3 * 3600_000 - 15 * 60_000)).toBe('3h 15m ago');
  });

  it('omits sub-unit when zero for hours', () => {
    expect(formatElapsedNumeric(Date.now() - 3 * 3600_000)).toBe('3h ago');
  });

  it('includes remaining hours in days', () => {
    expect(formatElapsedNumeric(Date.now() - 3 * 24 * 3600_000 - 5 * 3600_000)).toBe('3d 5h ago');
  });

  it('omits sub-unit when zero for days', () => {
    expect(formatElapsedNumeric(Date.now() - 3 * 24 * 3600_000)).toBe('3d ago');
  });

  it('includes remaining days in weeks', () => {
    expect(formatElapsedNumeric(Date.now() - 3 * 7 * 24 * 3600_000 - 2 * 24 * 3600_000)).toBe('3w 2d ago');
  });

  it('omits sub-unit when zero for weeks', () => {
    expect(formatElapsedNumeric(Date.now() - 3 * 7 * 24 * 3600_000)).toBe('3w ago');
  });

  it('includes remaining days in months', () => {
    expect(formatElapsedNumeric(Date.now() - 4 * 30 * 24 * 3600_000 - 10 * 24 * 3600_000)).toBe('4mo 10d ago');
  });

  it('omits sub-unit when zero for months', () => {
    expect(formatElapsedNumeric(Date.now() - 4 * 30 * 24 * 3600_000)).toBe('4mo ago');
  });

  it('includes remaining months in years', () => {
    expect(formatElapsedNumeric(Date.now() - 3 * 365 * 24 * 3600_000 - 2 * 30 * 24 * 3600_000)).toBe('3y 2mo ago');
  });

  it('omits sub-unit when zero for years', () => {
    expect(formatElapsedNumeric(Date.now() - 3 * 365 * 24 * 3600_000)).toBe('3y ago');
  });
});

describe('formatElapsed (combined)', () => {
  beforeAll(() => {
    // June 20, 2026 14:30:00 local time (Saturday)
    jest.useFakeTimers({
      now: new Date(2026, 5, 20, 14, 30, 0),
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  // ---- Null ----

  it('returns "Never" for null', () => {
    expect(formatElapsed(null)).toBe('Never');
  });

  // ---- Just now (< 60s) ----

  it('returns "Just now" within 60 seconds', () => {
    expect(formatElapsed(Date.now() - 30_000)).toBe('Just now');
    expect(formatElapsed(Date.now())).toBe('Just now');
  });

  // ---- Minutes (< 1h) ----

  it('returns "Xm ago" for < 1 hour', () => {
    expect(formatElapsed(Date.now() - 5 * 60_000)).toBe('5m ago');
    expect(formatElapsed(Date.now() - 1 * 60_000)).toBe('1m ago');
    expect(formatElapsed(Date.now() - 59 * 60_000)).toBe('59m ago');
  });

  // ---- Today (same calendar day) ----

  it('returns "Today · Xh ago" for same calendar day', () => {
    expect(formatElapsed(Date.now() - 3 * 3600_000)).toBe('Today · 3h ago');
    expect(formatElapsed(Date.now() - 1 * 3600_000)).toBe('Today · 1h ago');
    expect(formatElapsed(Date.now() - 10 * 3600_000)).toBe('Today · 10h ago');
  });

  // ---- Yesterday ----

  it('returns "Yesterday · Xd ago" for previous calendar day', () => {
    // June 19 (Friday), exactly 24h ago → 1d ago
    expect(formatElapsed(Date.now() - 24 * 3600_000)).toBe('Yesterday · 1d ago');
    // June 19, 30h ago → 1d 6h ago
    expect(formatElapsed(Date.now() - 30 * 3600_000)).toBe('Yesterday · 1d 6h ago');
  });

  // ---- Day of week (2-6 days ago, same month) ----

  it('returns "DayName · Xd ago" for 2-6 days ago', () => {
    // June 18 (Thursday), 2 days ago
    expect(formatElapsed(Date.now() - 2 * 24 * 3600_000)).toBe('Thursday · 2d ago');
    // June 15 (Monday), 5 days ago
    expect(formatElapsed(Date.now() - 5 * 24 * 3600_000)).toBe('Monday · 5d ago');
    // June 14 (Sunday), 6 days ago
    expect(formatElapsed(Date.now() - 6 * 24 * 3600_000)).toBe('Sunday · 6d ago');
  });

  // ---- Last week (7-13 days ago, same month) ----

  it('returns "Last Week · Xw ago" for 7-13 days ago (same month)', () => {
    // June 13 (Saturday), 7 days ago — exact 1 week
    expect(formatElapsed(Date.now() - 7 * 24 * 3600_000)).toBe('Last Week · 1w ago');
    // June 10 (Wednesday), 10 days ago → 1w 3d
    expect(formatElapsed(Date.now() - 10 * 24 * 3600_000)).toBe('Last Week · 1w 3d ago');
    // June 7 (Sunday), 13 days ago → 1w 6d
    expect(formatElapsed(Date.now() - 13 * 24 * 3600_000)).toBe('Last Week · 1w 6d ago');
  });

  // ---- Last month · Xw ago (>= 7 days, in previous calendar month) ----

  it('returns "Last Month · Xw ago" for events in previous calendar month', () => {
    // May 30 (Saturday), 21 days ago — exact 3 weeks
    expect(formatElapsed(Date.now() - 21 * 24 * 3600_000)).toBe('Last Month · 3w ago');
    // May 26 (Tuesday), 25 days ago → 3w 4d
    expect(formatElapsed(Date.now() - 25 * 24 * 3600_000)).toBe('Last Month · 3w 4d ago');
    // May 21 (Thursday), 30 days ago → 4w 2d
    expect(formatElapsed(Date.now() - 30 * 24 * 3600_000)).toBe('Last Month · 4w 2d ago');
  });

  // ---- Xw ago (14-59 days, NOT in last month) ----

  it('returns "Xw ago" for 14-59 days (not in last month)', () => {
    // June 6 (Saturday), 14 days ago — still in June (not last month)
    expect(formatElapsed(Date.now() - 14 * 24 * 3600_000)).toBe('2w ago');
    // April 25 (Saturday), 56 days ago — in April (not last month)
    expect(formatElapsed(Date.now() - 56 * 24 * 3600_000)).toBe('8w ago');
  });

  // ---- Xmo ago (60-364 days, NOT in last year) ----

  it('returns "Xmo ago" for 60-364 days (not in last year)', () => {
    // March 22, 2026 (Sunday), 90 days ago — still 2026 (not last year)
    expect(formatElapsed(Date.now() - 90 * 24 * 3600_000)).toBe('3mo ago');
  });

  // ---- Last year · Xmo ago (in previous calendar year, < 12 months) ----

  it('returns "Last Year · Xmo ago" for events in previous calendar year', () => {
    // July 25, 2025 — 330 days ago, in 2025, months = 11
    expect(formatElapsed(Date.now() - 330 * 24 * 3600_000)).toBe('Last Year · 11mo ago');
    // December 2, 2025 — 200 days ago, months = 6, remaining days = 20
    expect(formatElapsed(Date.now() - 200 * 24 * 3600_000)).toBe('Last Year · 6mo 20d ago');
  });

  // ---- Xy ago (365+ days) ----

  it('returns "Xy ago" for 365+ days', () => {
    expect(formatElapsed(Date.now() - 365 * 24 * 3600_000)).toBe('1y ago');
    expect(formatElapsed(Date.now() - 730 * 24 * 3600_000)).toBe('2y ago');
  });
});

describe('formatDuration', () => {
  it('returns "Just now" for < 60 seconds', () => {
    expect(formatDuration(30_000)).toBe('Just now');
    expect(formatDuration(0)).toBe('Just now');
  });

  it('returns "Xm" for < 1 hour', () => {
    expect(formatDuration(5 * 60_000)).toBe('5m');
    expect(formatDuration(1 * 60_000)).toBe('1m');
    expect(formatDuration(59 * 60_000)).toBe('59m');
  });

  it('includes seconds when requested', () => {
    expect(formatDuration(30_000, true)).toBe('30s');
    expect(formatDuration(90_000, true)).toBe('1m 30s');
  });

  it('returns "Xh Ym" for hours and minutes', () => {
    expect(formatDuration(1 * 3600_000 + 23 * 60_000)).toBe('1h 23m');
    expect(formatDuration(2 * 3600_000 + 5 * 60_000)).toBe('2h 5m');
    expect(formatDuration(12 * 3600_000)).toBe('12h');
  });

  it('returns "Xd Yh" for days and hours', () => {
    expect(formatDuration(3 * 24 * 3600_000 + 5 * 3600_000)).toBe('3d 5h');
    expect(formatDuration(1 * 24 * 3600_000 + 12 * 3600_000 + 30 * 60_000)).toBe('1d 12h');
    expect(formatDuration(7 * 24 * 3600_000)).toBe('7d');
  });

  it('returns "Xd Ym" for days and minutes (no hours)', () => {
    expect(formatDuration(2 * 24 * 3600_000 + 15 * 60_000)).toBe('2d 15m');
  });
});

// Separate suite for year-boundary scenarios (different mocked time)
describe('formatElapsed — year boundary', () => {
  beforeAll(() => {
    jest.useFakeTimers({
      now: new Date(2027, 0, 5, 14, 30, 0),
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('handles "Last month" when previous month crosses year boundary (Dec → Jan)', () => {
    // January 5, 2027 — last calendar month is December 2026
    // December 25, 2026 (11 days ago, in December)
    const dec25 = new Date(2026, 11, 25, 14, 30, 0).getTime();
    expect(formatElapsed(dec25)).toBe('Last Month · 1w 4d ago');
  });
});

// Separate suite for edge cases with different mocked times
describe('formatElapsed — early month', () => {
  beforeAll(() => {
    jest.useFakeTimers({
      now: new Date(2026, 5, 1, 14, 30, 0),
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('handles "Last month" for events 7+ days ago in previous month', () => {
    // June 1, 2026 — last month is May
    // May 25 (7 days ago)
    const may25 = new Date(2026, 4, 25, 14, 30, 0).getTime();
    expect(formatElapsed(may25)).toBe('Last Month · 1w ago');
  });

  it('shows day name for 2-6 days ago even if in last month', () => {
    // June 1 is Monday. May 30 is Saturday (2 days ago, days=2, < 7)
    const may30 = new Date(2026, 4, 30, 14, 30, 0).getTime();
    expect(formatElapsed(may30)).toBe('Saturday · 2d ago');
  });
});
