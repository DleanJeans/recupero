import { calendarDayDiff } from '../src/utils/dateUtils';

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
