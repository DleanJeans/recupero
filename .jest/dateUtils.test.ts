import { calendarDayDiff, describeDay } from '../src/utils/dateUtils';

function ts(dateStr: string, time: string = '12:00'): number {
  return new Date(`${dateStr}T${time}:00`).getTime();
}

describe('calendarDayDiff', () => {
  it('returns 0 for the same calendar day, regardless of time-of-day', () => {
    expect(calendarDayDiff(ts('2026-06-10', '08:00'), ts('2026-06-10', '23:59'))).toBe(0);
    expect(calendarDayDiff(ts('2026-06-10', '00:00'), ts('2026-06-10', '00:00'))).toBe(0);
  });

  it('returns 2 for adjacent calendar days crossing one midnight', () => {
    // Wed 11pm → Fri 1am: 2 calendar days elapsed (start-of-Wed to start-of-Fri)
    expect(calendarDayDiff(ts('2026-06-12', '01:00'), ts('2026-06-10', '23:00'))).toBe(2);
  });

  it('returns 3 for two day-boundaries crossed', () => {
    // Wed → Sat: start-of-Wed to start-of-Sat = 3 days
    expect(calendarDayDiff(ts('2026-06-13', '12:00'), ts('2026-06-10', '12:00'))).toBe(3);
  });

  it('returns 7 for a full week', () => {
    expect(calendarDayDiff(ts('2026-06-17', '12:00'), ts('2026-06-10', '12:00'))).toBe(7);
  });

  it('handles month boundaries', () => {
    expect(calendarDayDiff(ts('2026-07-01', '12:00'), ts('2026-06-30', '12:00'))).toBe(1);
    expect(calendarDayDiff(ts('2026-07-31', '12:00'), ts('2026-06-30', '12:00'))).toBe(31);
  });

  it('handles year boundaries', () => {
    expect(calendarDayDiff(ts('2026-01-01', '12:00'), ts('2025-12-31', '12:00'))).toBe(1);
  });

  it('returns negative when later precedes earlier', () => {
    expect(calendarDayDiff(ts('2026-06-10', '12:00'), ts('2026-06-11', '12:00'))).toBe(-1);
  });

  it('accepts Date objects', () => {
    const a = new Date('2026-06-12T12:00:00');
    const b = new Date('2026-06-10T12:00:00');
    expect(calendarDayDiff(a, b)).toBe(2);
  });

  it('accepts mixed Date and number', () => {
    const a = new Date('2026-06-12T12:00:00');
    expect(calendarDayDiff(a, ts('2026-06-10', '12:00'))).toBe(2);
  });
});

describe('describeDay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-17T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('describes today and yesterday', () => {
    expect(describeDay('2026-06-17')).toBe('Today');
    expect(describeDay('2026-06-16')).toBe('Yesterday');
  });

  it('uses weekday for dates earlier in the current week', () => {
    expect(describeDay('2026-06-15')).toBe('Monday');
  });

  it('uses Last weekday for dates in the previous week even when less than seven days ago', () => {
    expect(describeDay('2026-06-11')).toBe('Last Thursday');
  });

  it('uses days ago for dates older than last week', () => {
    expect(describeDay('2026-06-02')).toBe('15d ago');
  });

  it('honors the day cutoff when identifying today and yesterday', () => {
    jest.setSystemTime(new Date('2026-06-17T04:00:00'));

    expect(describeDay('2026-06-16', 5)).toBe('Today');
    expect(describeDay('2026-06-15', 5)).toBe('Yesterday');
  });
});
