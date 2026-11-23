import {
  getBmr,
  getCalorieBalance,
  getDailyBurn,
  kcalToPercent,
  percentToKcal,
} from '../src/utils/calorie-balance-utils';

describe('calorie balance', () => {
  const profile = { sex: 'male' as const, age: 30, weightKg: 80, heightCm: 180, activity: 1.5 };

  it('computes Mifflin-St Jeor BMR', () => {
    expect(getBmr(profile)).toBe(1780);
    expect(getDailyBurn(profile)).toBe(2670);
    expect(getBmr({ ...profile, sex: 'female' })).toBe(1614);
  });

  it('uses a typed burn over the estimate', () => {
    expect(getDailyBurn({ ...profile, fixedKcal: 2200 })).toBe(2200);
  });

  it('skips unlogged days and prorates today', () => {
    const days = [
      { day: 'a', eaten: 2000, logged: true, isToday: false },
      { day: 'b', eaten: 0, logged: false, isToday: false },
      { day: 'c', eaten: 1000, logged: true, isToday: true },
    ];
    const result = getCalorieBalance(days, 2000, 0.5);
    expect(result.countedDays).toBe(2);
    expect(result.skippedDays).toBe(1);
    expect(result.eatenTotal).toBe(3000);
    expect(result.burnedTotal).toBe(3000);
    expect(result.netPerDay).toBe(0);
  });

  it('converts kcal and need points', () => {
    expect(kcalToPercent(400, 800)).toBe(50);
    expect(percentToKcal(12.5, 800)).toBe(100);
  });
});
