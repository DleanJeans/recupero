import type { BehaviorEntry } from '../types/behavior';
import type { EnergyProfile, NeedCheckIn, NeedMetadataSource } from '../types/need';
import { toDateString } from './date-utils';
import { getSourceForBehavior, getSourceValue } from './need-utils';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type BalanceRange = 1 | 7 | 30;
export const BALANCE_RANGES: readonly BalanceRange[] = [1, 7, 30];

export const ACTIVITY_LEVELS: ReadonlyArray<{ factor: number; label: string; hint: string }> = [
  { factor: 1.2, label: 'Desk', hint: 'little exercise' },
  { factor: 1.375, label: 'Light', hint: '1-3 workouts a week' },
  { factor: 1.55, label: 'Active', hint: '3-5 workouts a week' },
  { factor: 1.725, label: 'Very', hint: 'hard training most days' },
];

export const DEFAULT_ENERGY_PROFILE: EnergyProfile = {
  sex: 'male',
  age: 30,
  weightKg: 70,
  heightCm: 175,
  activity: 1.375,
};

/** Resting energy burn per day (Mifflin-St Jeor). */
export function getBmr(profile: Pick<EnergyProfile, 'sex' | 'age' | 'weightKg' | 'heightCm'>): number {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return base + (profile.sex === 'male' ? 5 : -161);
}

/** Estimated kcal burned in a whole day: the typed-in number, else BMR x activity. */
export function getDailyBurn(profile: EnergyProfile): number {
  if (profile.fixedKcal != null && profile.fixedKcal > 0) return profile.fixedKcal;
  return getBmr(profile) * profile.activity;
}

/** Fraction of the day (starting at the day cutoff hour) that has passed at `now`, 0-1. */
export function getDayElapsedFraction(now: number, dayCutoffHour: number): number {
  const date = new Date(now);
  const start = new Date(date);
  start.setHours(dayCutoffHour, 0, 0, 0);
  if (start.getTime() > now) start.setDate(start.getDate() - 1);
  return Math.min(1, Math.max(0.02, (now - start.getTime()) / MS_PER_DAY));
}

/** kcal a "didn't log it" top-up of `percent` points stands for, rounded to 5. */
export function percentToKcal(percent: number, fullKcal: number): number {
  return Math.round(((percent / 100) * fullKcal) / 5) * 5;
}

/** Need points a typed kcal amount stands for (100 = the need's full amount). */
export function kcalToPercent(kcal: number, fullKcal: number): number {
  return fullKcal > 0 ? (kcal / fullKcal) * 100 : 0;
}

export interface CalorieDay {
  day: string;
  eaten: number;
  /** Whether any food (a log with kcal or a top-up) was recorded that day. */
  logged: boolean;
  isToday: boolean;
}

/** kcal eaten per day for the last `days` days (today last): logs with the source's field, plus top-ups. */
export function getIntakeByDay(
  days: number,
  now: number,
  dayCutoffHour: number,
  behaviors: BehaviorEntry[],
  source: NeedMetadataSource,
  updates: NeedCheckIn[],
): CalorieDay[] {
  const keys = Array.from({ length: days }, (_, index) =>
    toDateString(new Date(now - (days - 1 - index) * MS_PER_DAY), dayCutoffHour),
  );
  const totals = new Map<string, number>(keys.map(key => [key, 0]));
  const dayOf = (ts: number) => toDateString(new Date(ts), dayCutoffHour);
  for (const behavior of behaviors) {
    const behaviorSource = getSourceForBehavior(source, behavior);
    if (!behaviorSource) continue;
    for (const log of behavior.logs) {
      if (log.batchBehaviorId) continue;
      const kcal = getSourceValue(behaviorSource, log.metadata);
      const key = dayOf(log.timestamp);
      if (kcal != null && totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + kcal);
    }
  }
  for (const update of updates) {
    if (update.amount == null) continue;
    const key = dayOf(update.ts);
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + (update.amount / 100) * source.fullAmount);
  }
  const today = keys[keys.length - 1];
  return keys.map(day => ({
    day,
    eaten: totals.get(day) ?? 0,
    logged: (totals.get(day) ?? 0) > 0,
    isToday: day === today,
  }));
}

export interface CalorieBalance {
  /** Days that count (they have food recorded). */
  countedDays: number;
  /** Days in the range with no food recorded, left out of the numbers. */
  skippedDays: number;
  eatenTotal: number;
  burnedTotal: number;
  /** Eaten minus burned over the counted days. Negative = deficit. */
  netTotal: number;
  eatenPerDay: number;
  burnedPerDay: number;
  netPerDay: number;
  /** Today is part of the counted days and still going, so its burn is only the part passed so far. */
  todayPartial: boolean;
}

/**
 * Eaten vs burned over the days with food recorded. Days with nothing logged are skipped (they
 * would read as a huge deficit). Today's burn counts only the part of the day that has passed.
 */
export function getCalorieBalance(days: CalorieDay[], dailyBurn: number, todayFraction: number): CalorieBalance {
  const counted = days.filter(day => day.logged);
  const eatenTotal = counted.reduce((sum, day) => sum + day.eaten, 0);
  const burnedTotal = counted.reduce((sum, day) => sum + dailyBurn * (day.isToday ? todayFraction : 1), 0);
  const count = Math.max(1, counted.length);
  return {
    countedDays: counted.length,
    skippedDays: days.length - counted.length,
    eatenTotal,
    burnedTotal,
    netTotal: eatenTotal - burnedTotal,
    eatenPerDay: eatenTotal / count,
    burnedPerDay: burnedTotal / count,
    netPerDay: (eatenTotal - burnedTotal) / count,
    todayPartial: counted.some(day => day.isToday),
  };
}

/** "+320" / "−1,240" with a real minus sign. */
export function formatSignedKcal(value: number): string {
  const rounded = Math.round(Math.abs(value));
  const text = rounded.toLocaleString('en-US');
  if (rounded === 0) return '0';
  return `${value < 0 ? '−' : '+'}${text}`;
}
