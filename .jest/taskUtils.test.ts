import type { TaskEntry } from '../src/types/task';
import { getFocusBonusMoney, getMoneyLogTransactions, MONEY_PER_TASK_STAR } from '../src/utils/money-utils';
import {
  FOCUS_BONUS_STARS,
  getFocusBonusDates,
  getFocusStreak,
  getTaskList,
  getTaskStarsForDate,
  getUncompletedTaskCountForDate,
  hasFocusBonusOnDate,
  isShoppingBehavior,
} from '../src/utils/task-utils';

function makeTask(overrides: Partial<TaskEntry> = {}): TaskEntry {
  return {
    id: 'task-1',
    title: 'Task',
    scheduledDate: '2026-11-17',
    stars: 1,
    completedDates: [],
    createdAt: new Date('2026-11-17T08:00:00').getTime(),
    ...overrides,
  };
}

function picked(id: string, dates: string[], completed: string[] = []): TaskEntry {
  return makeTask({ id, focusDates: dates, completedDates: completed });
}

describe('task lists', () => {
  it('sends tasks linked to a shopping behavior to Shopping unless a list was chosen', () => {
    const shopee = { name: 'Shopee-ng' };
    const app = { name: 'Browse', autoTrackApp: { packageName: 'com.shopee.vn', label: 'Shopee', syncedUntil: 0 } };
    expect(isShoppingBehavior(shopee)).toBe(true);
    expect(isShoppingBehavior(app)).toBe(true);
    expect(isShoppingBehavior({ name: 'Workout' })).toBe(false);
    expect(getTaskList(makeTask(), shopee)).toBe('shopping');
    expect(getTaskList(makeTask(), { name: 'Workout' })).toBe('next');
    expect(getTaskList(makeTask(), undefined)).toBe('next');
    expect(getTaskList(makeTask({ list: 'next' }), shopee)).toBe('next');
    expect(getTaskList(makeTask({ list: 'someday' }), undefined)).toBe('someday');
  });
});

describe("Today's 3", () => {
  const day = '2026-11-18';

  it('earns the bonus only when 3 picks are all done that day', () => {
    const two = [picked('a', [day], [day]), picked('b', [day], [day])];
    expect(hasFocusBonusOnDate(two, day)).toBe(false);

    const threeOpen = [...two, picked('c', [day])];
    expect(hasFocusBonusOnDate(threeOpen, day)).toBe(false);

    const threeDone = [...two, picked('c', [day], [day])];
    expect(hasFocusBonusOnDate(threeDone, day)).toBe(true);
    expect(getTaskStarsForDate(threeDone, day)).toBe(3 + FOCUS_BONUS_STARS);
    expect(getFocusBonusMoney(threeDone)).toBe(FOCUS_BONUS_STARS * MONEY_PER_TASK_STAR);
    const bonus = getMoneyLogTransactions([], [], threeDone).find(t => 'taskId' in t && t.taskId.startsWith('focus'));
    expect(bonus?.amount).toBe(FOCUS_BONUS_STARS * MONEY_PER_TASK_STAR);
  });

  it('a pick done on another day does not count', () => {
    const tasks = [picked('a', [day], [day]), picked('b', [day], [day]), picked('c', [day], ['2026-11-19'])];
    expect(hasFocusBonusOnDate(tasks, day)).toBe(false);
  });

  it('counts the streak back from today, and an unfinished today keeps yesterday', () => {
    const fullDay = (date: string, prefix: string) => [
      picked(`${prefix}1`, [date], [date]),
      picked(`${prefix}2`, [date], [date]),
      picked(`${prefix}3`, [date], [date]),
    ];
    const tasks = [...fullDay('2026-11-16', 'x'), ...fullDay('2026-11-17', 'y'), ...fullDay('2026-11-18', 'z')];
    expect(getFocusBonusDates(tasks)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18']);
    expect(getFocusStreak(tasks, '2026-11-18')).toBe(3);
    expect(getFocusStreak(tasks, '2026-11-19')).toBe(3);
    expect(getFocusStreak(tasks, '2026-11-20')).toBe(0);
    expect(getFocusStreak([...tasks, ...fullDay('2026-11-19', 'w')], '2026-11-19')).toBe(4);
  });

  it('nav badge counts open picks, or open Next up tasks when nothing is picked', () => {
    const today = '2026-11-19';
    const shopee = new Map([['s', { name: 'Shopee-ng' }]]);
    const tasks = [
      makeTask({ id: 'n1', scheduledDate: today }),
      makeTask({ id: 'n2', scheduledDate: today }),
      makeTask({ id: 'buy', behaviorId: 's', scheduledDate: today }),
      makeTask({ id: 'later', list: 'someday', scheduledDate: today }),
    ];
    expect(getUncompletedTaskCountForDate(tasks, today, 0, shopee)).toBe(2);
    const withPick = [...tasks, makeTask({ id: 'p', focusDates: [today], scheduledDate: today })];
    expect(getUncompletedTaskCountForDate(withPick, today, 0, shopee)).toBe(1);
  });
});
