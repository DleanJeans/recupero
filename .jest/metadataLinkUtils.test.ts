import type { BehaviorEntry, MetadataField } from '../src/types/behavior';
import type { Person } from '../src/types/person';
import type { TaskEntry } from '../src/types/task';
import { buildLogMetadata } from '../src/utils/metadata-calculation-utils';
import {
  buildLogLinkChips,
  buildTaskLogMetadata,
  getPickableTasks,
  resolveLinkTarget,
} from '../src/utils/metadata-link-utils';

const fields: MetadataField[] = [
  { key: 'kcal', label: 'Calories' },
  { key: 'task', label: 'Task', type: 'task' },
  { key: 'who', label: 'With', type: 'person' },
  { key: 'next', label: 'Then', type: 'behavior', listDisplay: 'hidden' },
];
const task = {
  id: 't1',
  title: 'Buy phone holder',
  icon: '📱',
  completedDates: [],
  createdAt: 2,
} as unknown as TaskEntry;
const doneTask = { id: 't2', title: 'Old', completedDates: ['2026-11-01'], createdAt: 5 } as unknown as TaskEntry;
const person = { id: 'p1', name: 'Anna', emoji: '👩' } as Person;
const behavior = { id: 'b1', name: 'Cooking' } as BehaviorEntry;
const targets = { tasks: [task, doneTask], behaviors: [behavior], people: [person] };

describe('metadata link fields', () => {
  it('resolves linked items and treats deleted ones as missing', () => {
    expect(resolveLinkTarget('person', 'p1', targets)).toEqual({ label: 'Anna', icon: '👩' });
    expect(resolveLinkTarget('task', 'gone', targets)).toBeUndefined();
    expect(resolveLinkTarget('task', '', targets)).toBeUndefined();
  });

  it('builds chips in field order, skipping hidden and empty links', () => {
    const chips = buildLogLinkChips(fields, { kcal: 5, task: 't1', who: 'p1', next: 'b1' }, targets);
    expect(chips.map(chip => chip.label)).toEqual(['Buy phone holder', 'Anna']);
    const missing = buildLogLinkChips(fields, { who: 'old' }, targets);
    expect(missing[0]).toMatchObject({ label: 'Deleted person', missing: true });
  });

  it('stores link ids as text and numbers as numbers when building log metadata', () => {
    const metadata = buildLogMetadata({ fields, values: { kcal: '12', task: 't1', who: ' ', next: 'b1' } });
    expect(metadata).toEqual({ kcal: 12, task: 't1', next: 'b1' });
  });

  it('links a task in the Task field, else falls back to notes', () => {
    expect(buildTaskLogMetadata(fields, task)).toEqual({ task: 't1' });
    expect(buildTaskLogMetadata([{ key: 'kcal', label: 'Calories' }], task)).toEqual({ notes: 'Buy phone holder' });
    expect(buildTaskLogMetadata(fields, undefined)).toEqual({});
  });

  it('lists open tasks before finished ones', () => {
    expect(getPickableTasks([doneTask, task]).map(item => item.id)).toEqual(['t1', 't2']);
  });
});
