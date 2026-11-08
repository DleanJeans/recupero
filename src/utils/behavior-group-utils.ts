import type { BehaviorEntry, Category } from '../types/behavior';
import { isArchived } from './archive-utils';
import {
  getBehaviorAmountField,
  getBehaviorMetadataFields,
  getInitialLogMetadataValues,
  getMetadataFieldCalculation,
} from './metadata-calculation-utils';
import { getBehaviorXp } from './xp-utils';

/** Trims and collapses spaces. Empty names mean "no group". */
export function normalizeGroupName(name: string | undefined): string | undefined {
  const normalized = (name ?? '').trim().replace(/\s+/g, ' ');
  return normalized === '' ? undefined : normalized;
}

function groupKey(name: string | undefined): string | undefined {
  return normalizeGroupName(name)?.toLocaleLowerCase();
}

export function isSameGroup(a: string | undefined, b: string | undefined): boolean {
  const key = groupKey(a);
  return key != null && key === groupKey(b);
}

/** Behaviours in the same group as `behavior` (including it), sorted by name. Archived members are left out,
 *  except `behavior` itself so its own chip still shows. Empty when it has no group. */
export function getGroupMembers(behaviors: BehaviorEntry[], behavior: BehaviorEntry): BehaviorEntry[] {
  if (!groupKey(behavior.group)) return [];
  return behaviors
    .filter(b => isSameGroup(b.group, behavior.group) && (b.id === behavior.id || !isArchived(b)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Chip label for a member: its name without the group name in front ("Omachi Bò Hầm" in "Omachi" -> "Bò Hầm"). */
export function getGroupMemberLabel(memberName: string, groupName: string | undefined): string {
  const group = normalizeGroupName(groupName);
  const name = memberName.trim();
  if (!group || name.length <= group.length) return name;
  if (name.slice(0, group.length).toLocaleLowerCase() !== group.toLocaleLowerCase()) return name;
  const rest = name
    .slice(group.length)
    .replace(/^[\s\-–—:·,/|]+/, '')
    .trim();
  // Only strip at a word boundary ("Omachi" must not eat the start of "Omachiya").
  if (rest === '' || name[group.length] === rest[0]) return name;
  return rest;
}

/** Existing group names, first spelling wins, sorted. */
export function getGroupNames(behaviors: BehaviorEntry[]): string[] {
  const byKey = new Map<string, string>();
  for (const behavior of behaviors) {
    const name = normalizeGroupName(behavior.group);
    if (!name) continue;
    const key = name.toLocaleLowerCase();
    if (!byKey.has(key)) byKey.set(key, name);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

export interface GroupTotals {
  logCount: number;
  xp: number;
  /** True when any member tracks XP, so the total XP is worth showing. */
  xpEnabled: boolean;
}

/** Totals across group members. Each member keeps its own XP; the group shows the sum. */
export function getGroupTotals(members: BehaviorEntry[]): GroupTotals {
  return members.reduce<GroupTotals>(
    (totals, member) => ({
      logCount: totals.logCount + member.logs.length,
      xp: totals.xp + getBehaviorXp(member),
      xpEnabled: totals.xpEnabled || member.xpEnabled === true,
    }),
    { logCount: 0, xp: 0, xpEnabled: false },
  );
}

/** Metadata inputs after switching the log form to another member of the group. Starts from the new
 *  member's defaults (e.g. its pack weight) and keeps any value the user typed over the old member's default. */
export function switchMemberMetadataValues(
  current: Record<string, string>,
  previous: BehaviorEntry,
  next: BehaviorEntry,
  categories: Category[],
): Record<string, string> {
  const previousFields = getBehaviorMetadataFields(previous, categories);
  const nextFields = getBehaviorMetadataFields(next, categories);
  const previousDefaults = getInitialLogMetadataValues(
    previousFields,
    getBehaviorAmountField(previous, previousFields),
    previous.defaultMetadata,
  );
  const nextAmountField = getBehaviorAmountField(next, nextFields);
  const result = getInitialLogMetadataValues(nextFields, nextAmountField, next.defaultMetadata);
  for (const field of nextFields) {
    const calculation = getMetadataFieldCalculation(field);
    if (calculation === 'per100') continue;
    if (calculation === 'amount' && field.key !== nextAmountField?.key) continue;
    const value = current[field.key];
    if (value == null || value === '' || value === previousDefaults[field.key]) continue;
    result[field.key] = value;
  }
  return result;
}

/** Whether a behaviour matches a search by its own name or its group name. */
export function matchesBehaviorOrGroupName(behavior: BehaviorEntry, lowerCaseQuery: string): boolean {
  return (
    behavior.name.toLowerCase().includes(lowerCaseQuery) ||
    (normalizeGroupName(behavior.group)?.toLowerCase().includes(lowerCaseQuery) ?? false)
  );
}

/** Replaces each group's members with one entry named after the group, for lists that show only the group.
 *  The entry takes the id, icon and settings of the most recently logged member, so opening it lands on that
 *  member (whose screen has chips for the others), and holds every member's logs so XP and "last logged" are
 *  the group's totals. Ungrouped behaviours and single-member groups pass through unchanged, in order. */
export function collapseBehaviorGroups(behaviors: BehaviorEntry[]): BehaviorEntry[] {
  const membersByKey = new Map<string, BehaviorEntry[]>();
  for (const behavior of behaviors) {
    const key = groupKey(behavior.group);
    if (!key) continue;
    const members = membersByKey.get(key);
    if (members) members.push(behavior);
    else membersByKey.set(key, [behavior]);
  }

  const result: BehaviorEntry[] = [];
  const emitted = new Set<string>();
  for (const behavior of behaviors) {
    const key = groupKey(behavior.group);
    const members = key ? membersByKey.get(key) : undefined;
    if (!key || !members || members.length < 2) {
      result.push(behavior);
      continue;
    }
    if (emitted.has(key)) continue;
    emitted.add(key);
    const representative = members.reduce((latest, member) =>
      (member.lastTimestamp ?? -Infinity) > (latest.lastTimestamp ?? -Infinity) ? member : latest,
    );
    const lastTimestamps = members.map(member => member.lastTimestamp).filter((t): t is number => t != null);
    result.push({
      ...representative,
      name: normalizeGroupName(representative.group) ?? representative.name,
      lastTimestamp: lastTimestamps.length > 0 ? Math.max(...lastTimestamps) : null,
      logs: members.flatMap(member => member.logs).sort((a, b) => a.timestamp - b.timestamp),
      xpEnabled: members.some(member => member.xpEnabled) ? true : undefined,
    });
  }
  return result;
}
