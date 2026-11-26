import type { TaskEntry } from '../src/types/task';
import { resolveChains } from '../src/utils/task-chain-utils';

function task(id: string, extra: Partial<TaskEntry> = {}): TaskEntry {
  return { id, title: id, scheduledDate: '2026-11-26', stars: 1, completedDates: [], createdAt: 1, ...extra };
}

describe('resolveChains', () => {
  it('starts the next step when the task ends, using the 5 min default', () => {
    const out = resolveChains([
      task('a', { startTime: '09:00', estimateMin: 30, nextTaskId: 'b' }),
      task('b', { startTime: '15:00', scheduledDate: '2026-11-30', nextTaskId: 'c' }),
      task('c'),
    ]);
    expect(out[1]).toMatchObject({ startTime: '09:30', scheduledDate: '2026-11-26' });
    expect(out[2]).toMatchObject({ startTime: '09:35' });
  });

  it('leaves done tasks and loops alone', () => {
    const done = task('b', { startTime: '15:00', completedDates: ['2026-11-26'] });
    expect(resolveChains([task('a', { startTime: '09:00', nextTaskId: 'b' }), done])[1]).toBe(done);
    const loop = [task('a', { startTime: '09:00', nextTaskId: 'b' }), task('b', { nextTaskId: 'a' })];
    expect(resolveChains(loop)).toBe(loop);
  });
});
