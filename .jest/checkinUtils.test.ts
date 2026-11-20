import {
  CHECKIN_DAILY_XP_LOGS,
  DEFAULT_CHECKIN_SETTINGS,
  getCheckInDays,
  getCheckInEvents,
  getCheckInNudgePlans,
  getCheckInStreak,
  getCheckInXp,
  getMoodMix,
  getNextCheckInXp,
  isCheckInStale,
  parseCheckInAction,
} from '../src/utils/checkin-utils';

const at = (day: number, hour = 12, minute = 0) => new Date(2026, 10, day, hour, minute).getTime();
const mood = (ts: number, value = 'good') => ({ id: `m${ts}`, mood: value, ts });
const body = (ts: number, value = 'hungry') => ({ id: `b${ts}`, sensation: value, ts });

describe('check-in XP', () => {
  it('awards 5 per mood and 3 per body log', () => {
    const events = getCheckInEvents([mood(at(10))], [body(at(10, 13))]);
    expect(getCheckInXp(events)).toBe(8);
  });

  it('stops awarding after the daily cap, per day', () => {
    const moods = Array.from({ length: CHECKIN_DAILY_XP_LOGS + 2 }, (_, i) => mood(at(10, 8 + i)));
    const events = getCheckInEvents([...moods, mood(at(11))], []);
    expect(getCheckInXp(events)).toBe((CHECKIN_DAILY_XP_LOGS + 1) * 5);
  });

  it('counts several picks logged together as one check-in', () => {
    const events = getCheckInEvents([], [body(at(10), 'hungry'), { ...body(at(10), 'thirsty'), id: 'b2' }]);
    expect(getCheckInXp(events)).toBe(3);
    const moods = Array.from({ length: CHECKIN_DAILY_XP_LOGS - 1 }, (_, i) => mood(at(10, 8 + i)));
    const all = getCheckInEvents(moods, [body(at(10, 15), 'hungry'), { ...body(at(10, 15), 'thirsty'), id: 'b2' }]);
    expect(getNextCheckInXp(all, 'mood', at(10, 20))).toBe(0);
  });

  it('predicts the next log XP', () => {
    const moods = Array.from({ length: CHECKIN_DAILY_XP_LOGS }, (_, i) => mood(at(10, 8 + i)));
    const events = getCheckInEvents(moods, []);
    expect(getNextCheckInXp(events, 'mood', at(10, 20))).toBe(0);
    expect(getNextCheckInXp(events, 'mood', at(11, 8))).toBe(5);
    expect(getNextCheckInXp(events, 'body', at(11, 8))).toBe(3);
  });
});

describe('check-in streak', () => {
  it('counts consecutive days ending today', () => {
    const events = getCheckInEvents([mood(at(8)), mood(at(9)), mood(at(10))], []);
    expect(getCheckInStreak(events, at(10, 15))).toEqual({ current: 3, best: 3, doneToday: true, atRisk: false });
  });

  it('keeps the streak alive through yesterday but marks it at risk', () => {
    const events = getCheckInEvents([mood(at(8)), mood(at(9))], []);
    expect(getCheckInStreak(events, at(10, 8))).toEqual({ current: 2, best: 2, doneToday: false, atRisk: true });
  });

  it('breaks after a missed day and remembers the best run', () => {
    const events = getCheckInEvents([mood(at(1)), mood(at(2)), mood(at(3)), mood(at(5))], []);
    const streak = getCheckInStreak(events, at(5, 20));
    expect(streak.current).toBe(1);
    expect(streak.best).toBe(3);
  });

  it('is zero with no logs', () => {
    expect(getCheckInStreak([], at(10))).toEqual({ current: 0, best: 0, doneToday: false, atRisk: false });
  });

  it('respects the day cutoff hour', () => {
    const events = getCheckInEvents([mood(at(9, 23)), mood(at(10, 1))], [], 4);
    expect(getCheckInStreak(events, at(10, 2), 4).current).toBe(1);
  });
});

describe('check-in days and mood mix', () => {
  it('lists the last days oldest first with done flags', () => {
    const events = getCheckInEvents([mood(at(9), 'okay'), mood(at(10), 'great')], []);
    const days = getCheckInDays(events, 3, at(10, 15));
    expect(days.map(day => day.done)).toEqual([false, true, true]);
    expect(days[2]).toMatchObject({ isToday: true, lastMood: 'great' });
  });

  it('counts moods within the window, most frequent first', () => {
    const mix = getMoodMix([mood(at(1), 'low'), mood(at(9), 'good'), mood(at(10), 'good')], 7, at(10));
    expect(mix).toEqual([{ mood: 'good', count: 2 }]);
  });
});

describe('stale check', () => {
  it('is stale with no log or an old one', () => {
    expect(isCheckInStale(undefined, 4, at(10))).toBe(true);
    expect(isCheckInStale(at(10, 6), 4, at(10, 12))).toBe(true);
    expect(isCheckInStale(at(10, 9), 4, at(10, 12))).toBe(false);
  });
});

describe('nudge plans', () => {
  const enabled = { ...DEFAULT_CHECKIN_SETTINGS, nudgesEnabled: true };

  it('plans nothing when nudges are off', () => {
    expect(getCheckInNudgePlans(DEFAULT_CHECKIN_SETTINGS, [], at(10, 8))).toEqual([]);
  });

  it('plans the remaining hours today and the next two days', () => {
    const plans = getCheckInNudgePlans(enabled, [], at(10, 12, 30));
    expect(plans).toHaveLength(2 + 3 + 3);
    expect(plans[0].at).toBe(at(10, 13));
  });

  it('skips a nudge shortly after a log', () => {
    const events = getCheckInEvents([mood(at(10, 11))], []);
    const plans = getCheckInNudgePlans(enabled, events, at(10, 11, 30));
    expect(plans.some(plan => plan.at === at(10, 13))).toBe(false);
    expect(plans.some(plan => plan.at === at(10, 19))).toBe(true);
  });

  it('adds a streak-saver today only when a streak is at risk', () => {
    const events = getCheckInEvents([mood(at(8)), mood(at(9))], []);
    const plans = getCheckInNudgePlans(enabled, events, at(10, 8));
    expect(plans.filter(plan => plan.saver)).toHaveLength(1);
    expect(plans.find(plan => plan.saver)?.at).toBe(at(10, 21));
    const done = getCheckInEvents([mood(at(9)), mood(at(10, 9))], []);
    expect(getCheckInNudgePlans(enabled, done, at(10, 10)).some(plan => plan.saver)).toBe(false);
  });
});

describe('notification actions', () => {
  it('reads the chosen mood', () => {
    expect(parseCheckInAction('checkin:mood:good')).toBe('good');
    expect(parseCheckInAction('expo.modules.notifications.actions.DEFAULT')).toBeUndefined();
  });
});
