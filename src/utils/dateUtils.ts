import { formatDistanceToNowStrict, isToday, isYesterday, parseISO } from 'date-fns';

export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDateDisplay(dateStr: string): string {
  const date = parseISO(dateStr);
  const local = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return local;
}
