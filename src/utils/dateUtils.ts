import { formatDistanceToNowStrict, isToday, isYesterday, parseISO } from 'date-fns';

export function formatDateDisplay(dateStr: string): string {
  const date = parseISO(dateStr);
  const local = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return local;
}
