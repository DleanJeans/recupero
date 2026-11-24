import type { TaskEntry } from '../src/types/task';
import { toDateString } from '../src/utils/date-utils';
import {
  formatPlaceDwell,
  getOneOffPlaceGeofenceRegions,
  getPlaceDwellMin,
  getPlaceTaskGeofenceWatches,
  getPlaceTaskNotificationContent,
  getPlaceTasksDueByDwell,
  getPlaceTasksForArrival,
  getTaskPlaceKey,
  pruneStalePlaceArrivals,
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
      { placeId: 'bank', enter: true, exit: true },
      { placeId: 'gym', enter: true, exit: true },
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

describe('place task dwell', () => {
  const now = Date.now();
  const min = 60_000;

  it('defaults to 5 minutes and keeps an explicit 0', () => {
    expect(getPlaceDwellMin(task('a'))).toBe(5);
    expect(getPlaceDwellMin(task('a', { placeDwellMin: 0 }))).toBe(0);
    expect(getPlaceDwellMin(task('a', { placeDwellMin: 15 }))).toBe(15);
  });

  it('formats the stay', () => {
    expect(formatPlaceDwell(0)).toBe('Instantly');
    expect(formatPlaceDwell(10)).toBe('10 min');
    expect(formatPlaceDwell(60)).toBe('1 h');
  });

  it('only completes tasks once the stay is long enough', () => {
    const tasks = [
      task('default', { placeId: 'gym' }),
      task('short', { placeId: 'gym', placeDwellMin: 2 }),
      task('instant', { placeId: 'gym', placeDwellMin: 0 }),
      task('other', { placeId: 'bank' }),
    ];
    const due = (enteredAt: number) => getPlaceTasksDueByDwell(tasks, { gym: enteredAt }, now, today).map(t => t.id);
    expect(due(now - 1 * min)).toEqual(['instant']);
    expect(due(now - 3 * min)).toEqual(['short', 'instant']);
    expect(due(now - 5 * min)).toEqual(['default', 'short', 'instant']);
  });

  it('drops arrivals we never saw the exit for', () => {
    expect(pruneStalePlaceArrivals({ old: now - 25 * 60 * min, fresh: now - min }, now)).toEqual({ fresh: now - min });
  });
});

describe('one-off places', () => {
  const oneOffPlace = { name: 'Dentist', lat: 1, lng: 2, radiusM: 40 };

  it('gives a task-only place its own geofence region and key', () => {
    const tasks = [task('a', { oneOffPlace }), task('b', { oneOffPlace, archived: true }), task('c')];
    const regions = getOneOffPlaceGeofenceRegions(tasks);
    expect(regions.map(region => region.identifier)).toEqual(['taskplace:a']);
    expect(regions[0]).toMatchObject({ latitude: 1, longitude: 2, notifyOnEnter: true, notifyOnExit: true });
    expect(getTaskPlaceKey(tasks[0])).toBe('taskplace:a');
    expect(getTaskPlaceKey(tasks[2])).toBeUndefined();
  });

  it('ticks a one-off place task on arrival at its key only', () => {
    const tasks = [task('a', { oneOffPlace })];
    expect(getPlaceTasksForArrival(tasks, 'taskplace:a', today).map(t => t.id)).toEqual(['a']);
    expect(getPlaceTasksForArrival(tasks, 'taskplace:b', today)).toEqual([]);
  });
});
