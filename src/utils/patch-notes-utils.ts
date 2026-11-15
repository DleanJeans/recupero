import { format, parseISO } from 'date-fns';

export function formatPatchNotesDate(date: string): string {
  return format(parseISO(date), 'EEE, MMM d, yyyy');
}
