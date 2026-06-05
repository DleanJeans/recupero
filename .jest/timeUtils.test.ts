import { formatCooldown, formatElapsed } from '../src/utils/timeUtils';

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

describe('formatElapsed', () => {
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

  it('returns "Yesterday" for previous calendar day', () => {
    // June 19 (Friday)
    expect(formatElapsed(Date.now() - 24 * 3600_000)).toBe('Yesterday');
    expect(formatElapsed(Date.now() - 30 * 3600_000)).toBe('Yesterday');
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

  it('returns "Last week" for 7-13 days ago (same month)', () => {
    // June 13 (Saturday), 7 days ago — still in June
    expect(formatElapsed(Date.now() - 7 * 24 * 3600_000)).toBe('Last week');
    // June 10 (Wednesday), 10 days ago
    expect(formatElapsed(Date.now() - 10 * 24 * 3600_000)).toBe('Last week');
    // June 7 (Sunday), 13 days ago
    expect(formatElapsed(Date.now() - 13 * 24 * 3600_000)).toBe('Last week');
  });

  // ---- Last month · Xw ago (>= 7 days, in previous calendar month) ----

  it('returns "Last month · Xw ago" for events in previous calendar month', () => {
    // May 30 (Saturday), 21 days ago — in May (last month from June)
    expect(formatElapsed(Date.now() - 21 * 24 * 3600_000)).toBe('Last month · 3w ago');
    // May 26 (Tuesday), 25 days ago
    expect(formatElapsed(Date.now() - 25 * 24 * 3600_000)).toBe('Last month · 3w ago');
    // May 21 (Thursday), 30 days ago
    expect(formatElapsed(Date.now() - 30 * 24 * 3600_000)).toBe('Last month · 4w ago');
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

  it('returns "Last year · Xmo ago" for events in previous calendar year', () => {
    // July 25, 2025 — 330 days ago, in 2025, months = 11
    expect(formatElapsed(Date.now() - 330 * 24 * 3600_000)).toBe('Last year · 11mo ago');
    // December 2, 2025 — 200 days ago, months = 6
    expect(formatElapsed(Date.now() - 200 * 24 * 3600_000)).toBe('Last year · 6mo ago');
  });

  // ---- Xy ago (365+ days) ----

  it('returns "Xy ago" for 365+ days', () => {
    expect(formatElapsed(Date.now() - 365 * 24 * 3600_000)).toBe('1y ago');
    expect(formatElapsed(Date.now() - 730 * 24 * 3600_000)).toBe('2y ago');
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
    expect(formatElapsed(dec25)).toBe('Last month · 1w ago');
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
    expect(formatElapsed(may25)).toBe('Last month · 1w ago');
  });

  it('shows day name for 2-6 days ago even if in last month', () => {
    // June 1 is Monday. May 30 is Saturday (2 days ago, days=2, < 7)
    const may30 = new Date(2026, 4, 30, 14, 30, 0).getTime();
    expect(formatElapsed(may30)).toBe('Saturday · 2d ago');
  });
});
