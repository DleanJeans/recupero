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
