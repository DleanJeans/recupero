import type { BehaviorEntry } from '../src/types/behavior';
import type { TaskEntry } from '../src/types/task';
import { DEFAULT_DRIVE_MIN, getDriveEstimateMin, isDrivingBehavior } from '../src/utils/drive-estimate-utils';

function task(id: string, extra: Partial<TaskEntry> = {}): TaskEntry {
  return { id, title: id, scheduledDate: '2026-11-26', stars: 1, completedDates: [], createdAt: 1, ...extra };
}

const MIN = 60000;

describe('getDriveEstimateMin', () => {
  it('defaults to 15 min with no history', () => {
    expect(getDriveEstimateMin(task('a', { placeId: 'p' }), [], undefined)).toBe(DEFAULT_DRIVE_MIN);
  });

  it('averages past drives to the same place first', () => {
    const tasks = [
      task('x', { placeId: 'p', drive: { start: 0, end: 20 * MIN } }),
      task('y', { placeId: 'p', drive: { start: 0, end: 30 * MIN } }),
      task('z', { placeId: 'other', drive: { start: 0, end: 90 * MIN } }),
    ];
    expect(getDriveEstimateMin(task('a', { placeId: 'p' }), tasks, undefined)).toBe(25);
  });

  it('falls back to the average of all Driving logs', () => {
    const driving = { logs: [{ id: '1', timestamp: 0, endTimestamp: 40 * MIN }] } as unknown as BehaviorEntry;
    expect(getDriveEstimateMin(task('a', { placeId: 'p' }), [], driving)).toBe(40);
  });
});

describe('isDrivingBehavior', () => {
  it('matches the name ignoring case, unless archived', () => {
    expect(isDrivingBehavior({ name: ' driving ', archivedAt: undefined })).toBe(true);
    expect(isDrivingBehavior({ name: 'Driving', archivedAt: 5 })).toBe(false);
  });
});
