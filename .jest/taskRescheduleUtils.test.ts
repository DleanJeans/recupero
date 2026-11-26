import { cascadeReschedule, findOverlaps } from '../src/utils/task-reschedule-utils';

const t = (id: string, startTime: string, estimateMin?: number, createdAt = 0) => ({
  id,
  startTime,
  estimateMin,
  createdAt,
});

describe('findOverlaps', () => {
  it('flags a task that starts before the previous one ends', () => {
    const overlaps = findOverlaps([t('a', '09:00', 60), t('b', '09:30', 30), t('c', '11:00', 30)]);
    expect(overlaps.get('b')).toEqual({ suggestedStart: '10:00' });
    expect(overlaps.has('c')).toBe(false);
    expect(overlaps.has('a')).toBe(false);
  });
  it('treats a task without an estimate as 5 min', () => {
    expect(findOverlaps([t('a', '09:00'), t('b', '09:03')]).get('b')).toEqual({ suggestedStart: '09:05' });
    expect(findOverlaps([t('a', '09:00'), t('b', '09:05')]).size).toBe(0);
  });
});

describe('cascadeReschedule', () => {
  it('pushes following tasks only as far as needed', () => {
    const tasks = [t('a', '09:00', 30), t('b', '09:30', 30), t('c', '10:00', 30), t('d', '12:00', 30)];
    const changes = cascadeReschedule(tasks, 'a', '09:15');
    expect(changes).toEqual([
      { id: 'a', startTime: '09:15' },
      { id: 'b', startTime: '09:45' },
      { id: 'c', startTime: '10:15' },
    ]);
  });
  it('leaves earlier tasks and gaps alone', () => {
    const tasks = [t('a', '08:00', 30), t('b', '09:00', 30), t('c', '11:00', 30)];
    expect(cascadeReschedule(tasks, 'b', '09:30')).toEqual([{ id: 'b', startTime: '09:30' }]);
  });
  it('caps at the end of the day', () => {
    const tasks = [t('a', '23:00', 60), t('b', '23:30', 60)];
    expect(cascadeReschedule(tasks, 'a', '23:10')).toEqual([
      { id: 'a', startTime: '23:10' },
      { id: 'b', startTime: '23:59' },
    ]);
  });
});
