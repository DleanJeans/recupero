import { format, parseISO } from 'date-fns';
import type { PatchNotesDay, PatchNotesItem } from '../data/patch-notes';

export function formatPatchNotesDate(date: string): string {
  return format(parseISO(date), 'EEE, MMM d, yyyy');
}

export function patchNotesItemText(item: PatchNotesItem): string {
  return typeof item === 'string' ? item : item.text;
}

/** Splits text around the first occurrence of phrase. Returns null when the phrase is missing or empty. */
export function splitAtPhrase(text: string, phrase?: string): { before: string; match: string; after: string } | null {
  if (!phrase) return null;
  const index = text.indexOf(phrase);
  if (index < 0) return null;
  return { before: text.slice(0, index), match: phrase, after: text.slice(index + phrase.length) };
}

/**
 * Items the user has not seen yet. When nothing was recorded (first run with this feature), everything
 * older than the newest day counts as seen so only the latest changes carry the NEW tag.
 */
export function findNewPatchNotes(days: PatchNotesDay[], seen: string[] | null): string[] {
  const all = days.flatMap(day => day.items.map(patchNotesItemText));
  if (seen) return all.filter(text => !seen.includes(text));
  return (days[0]?.items ?? []).map(patchNotesItemText);
}
