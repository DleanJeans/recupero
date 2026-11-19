import { format, parseISO } from 'date-fns';
import type { PatchNotesItem } from '../data/patch-notes';

export function formatPatchNotesDate(date: string): string {
  return format(parseISO(date), 'EEE, MMM d, yyyy');
}

export function patchNotesItemText(item: PatchNotesItem): string {
  return typeof item === 'string' ? item : item.text;
}
