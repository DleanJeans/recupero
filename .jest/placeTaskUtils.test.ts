import type { TaskEntry } from '../src/types/task';
import { toDateString } from '../src/utils/date-utils';
import {
  getPlaceTaskGeofenceWatches,
  getPlaceTaskNotificationContent,
  getPlaceTasksForArrival,
} from '../src/utils/place-task-utils';

const today = toDateString(new Date());

const task = (id: string, overrides: Partial<TaskEntry> = {}): TaskEntry => ({
  id,
  title: `Task ${id}`,
  scheduledDate: today,
  stars: 1,
  completedDates: [],
  createdAt: Date.now(),
  ...overrides,
});

describe('getPlaceTaskGeofenceWatches', () => {
  it('watches arrival at each place an open task points at, once per place', () => {
    const tasks = [
      task('a', { placeId: 'gym' }),
      task('b', { placeId: 'gym' }),
      task('c', { placeId: 'bank' }),
      task('d'),
      task('e', { placeId: 'park', completedDates: [today] }),
      task('f', { placeId: 'shop', archived: true }),
    ];
    expect(getPlaceTaskGeofenceWatches(tasks)).toEqual([
      { placeId: 'bank', enter: true },
      { placeId: 'gym', enter: true },
    ]);
  });
});

describe('getPlaceTasksForArrival', () => {
  it("returns today's unfinished tasks for that place", () => {
    const tasks = [
      task('a', { placeId: 'gym' }),
      task('b', { placeId: 'bank' }),
      task('c', { placeId: 'gym', completedDates: [today] }),
      task('d', { placeId: 'gym', archived: true }),
    ];
    expect(getPlaceTasksForArrival(tasks, 'gym', today).map(t => t.id)).toEqual(['a']);
  });
});

describe('getPlaceTaskNotificationContent', () => {
  const gym = { name: 'Gym', emoji: '🏋️', isHome: false };
  it('names a single task', () => {
    expect(getPlaceTaskNotificationContent([{ title: 'Return shoes' }], gym)).toEqual({
      title: 'Done: Return shoes',
      body: '🏋️ You arrived at Gym.',
    });
  });
  it('lists several tasks', () => {
    expect(getPlaceTaskNotificationContent([{ title: 'A' }, { title: 'B' }], gym).title).toBe('2 tasks done');
  });
});
