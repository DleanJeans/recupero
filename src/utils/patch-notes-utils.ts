import { format, parseISO } from 'date-fns';
import type { PatchNotesItem } from '../data/patch-notes';

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
