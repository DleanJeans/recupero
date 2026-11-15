import { format, parseISO } from 'date-fns';
import type { PatchNotesDay } from '../data/patch-notes';

export const PATCH_NOTES_COLLAPSED_DAYS = 3;

export function formatPatchNotesDate(date: string): string {
  return format(parseISO(date), 'EEE, MMM d, yyyy');
}

export function visiblePatchNotes(notes: PatchNotesDay[], expanded: boolean): PatchNotesDay[] {
  return expanded ? notes : notes.slice(0, PATCH_NOTES_COLLAPSED_DAYS);
}
