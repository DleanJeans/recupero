import type { BehaviorEntry, Category, MetadataField, MetadataFieldType } from '../types/behavior';
import type { Person } from '../types/person';
import type { TaskEntry } from '../types/task';
import { buildQuickLogMetadata } from './checklist-utils';
import type { IconValue } from './icon-utils';
import { isLinkMetadataField } from './metadata-calculation-utils';

export type LinkFieldType = Exclude<MetadataFieldType, 'number'>;

export const METADATA_FIELD_TYPE_LABELS: Record<MetadataFieldType, string> = {
  number: 'Number',
  task: 'Task',
  behavior: 'Behavior',
  person: 'Person',
};

/** Fallback emoji for each link type when the linked item has no icon of its own. */
export const LINK_TYPE_EMOJIS: Record<LinkFieldType, string> = { task: '✅', behavior: '⏱️', person: '🧑' };

export const LINK_TYPE_PLACEHOLDERS: Record<LinkFieldType, string> = {
  task: 'Choose a task',
  behavior: 'Choose a behavior',
  person: 'Choose a person',
};

export interface LinkTargets {
  tasks: ReadonlyArray<TaskEntry> | undefined;
  behaviors: ReadonlyArray<BehaviorEntry>;
  people: ReadonlyArray<Person>;
}

export interface LinkTarget {
  label: string;
  /** Icon value (emoji, mix, image...). Undefined when the item has none: use LINK_TYPE_EMOJIS. */
  icon?: IconValue;
}

export function getFieldLinkType(field: MetadataField): LinkFieldType | undefined {
  return isLinkMetadataField(field) ? (field.type as LinkFieldType) : undefined;
}

/** The linked task, behavior or person, or undefined when the id is empty or the item was deleted. */
export function resolveLinkTarget(
  type: LinkFieldType,
  id: string | number | undefined,
  targets: LinkTargets,
): LinkTarget | undefined {
  if (id == null || id === '') return undefined;
  const key = String(id);
  if (type === 'task') {
    const task = targets.tasks?.find(candidate => candidate.id === key);
    return task ? { label: task.title, icon: task.icon } : undefined;
  }
  if (type === 'behavior') {
    const behavior = targets.behaviors.find(candidate => candidate.id === key);
    return behavior ? { label: behavior.name, icon: behavior.icon } : undefined;
  }
  const person = targets.people.find(candidate => candidate.id === key);
  return person ? { label: person.name, icon: person.emoji } : undefined;
}

export interface LogLinkChip {
  key: string;
  type: LinkFieldType;
  fieldLabel: string;
  label: string;
  icon?: IconValue;
  /** The linked item was deleted since the log was saved. */
  missing: boolean;
}

/** Chips for the links on a log (listDisplay 'hidden' ones left out), in the saved field order. */
export function buildLogLinkChips(
  fields: MetadataField[] | undefined,
  metadata: Record<string, string | number> | undefined,
  targets: LinkTargets,
): LogLinkChip[] {
  if (!fields || !metadata) return [];
  const chips: LogLinkChip[] = [];
  for (const field of fields) {
    const type = getFieldLinkType(field);
    const raw = metadata[field.key];
    if (!type || raw == null || raw === '' || field.listDisplay === 'hidden') continue;
    const target = resolveLinkTarget(type, raw, targets);
    chips.push({
      key: field.key,
      type,
      fieldLabel: field.label,
      label: target?.label ?? `Deleted ${type}`,
      icon: target?.icon,
      missing: target == null,
    });
  }
  return chips;
}

/** First link field of a type among the fields, e.g. the Task field a task-started log should fill. */
export function getFirstLinkField(fields: MetadataField[] | undefined, type: LinkFieldType): MetadataField | undefined {
  return fields?.find(field => field.type === type);
}

/**
 * Logs made from a task link the task in the category's Task field instead of putting its name in the notes.
 * Categories without a Task field keep the old behaviour (task name as notes). Returns metadata to merge in.
 */
export function buildTaskLogMetadata(
  fields: MetadataField[] | undefined,
  task: { id?: string; title?: string } | undefined,
): Record<string, string> {
  if (!task) return {};
  const field = task.id ? getFirstLinkField(fields, 'task') : undefined;
  if (field && task.id) return { [field.key]: task.id };
  const title = task.title?.trim();
  return title ? { notes: title } : {};
}

export function getCategoryFields(
  behavior: Pick<BehaviorEntry, 'categoryId'>,
  categories: ReadonlyArray<Category>,
): MetadataField[] | undefined {
  return behavior.categoryId
    ? categories.find(category => category.id === behavior.categoryId)?.metadataFields
    : undefined;
}

/** Tasks to pick from: open ones first (newest first), then finished ones. Behavior checklist entries are left out. */
export function getPickableTasks(tasks: ReadonlyArray<TaskEntry> | undefined): TaskEntry[] {
  const list = (tasks ?? []).filter(task => !task.archived && task.source !== 'behavior');
  const isDone = (task: TaskEntry) => task.completedDates.length > 0;
  return list.sort((a, b) => Number(isDone(a)) - Number(isDone(b)) || b.createdAt - a.createdAt);
}

/** Metadata for a log saved from a timer: the quick-log defaults plus the timer's task (linked or as notes). */
export function buildTimerLogMetadata(
  behavior: BehaviorEntry,
  categories: ReadonlyArray<Category>,
  notes: string | undefined,
  taskId: string | undefined,
): Record<string, string | number> | undefined {
  const base = buildQuickLogMetadata(behavior, categories as Category[]);
  const taskField = taskId ? getFirstLinkField(getCategoryFields(behavior, categories), 'task') : undefined;
  const trimmed = notes?.trim();
  const extra: Record<string, string> =
    taskField && taskId ? { [taskField.key]: taskId } : trimmed ? { notes: trimmed } : {};
  const merged = { ...base, ...extra };
  return Object.keys(merged).length > 0 ? merged : undefined;
}
