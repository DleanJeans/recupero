import { formatDistanceToNowStrict, isToday, isYesterday, parseISO } from 'date-fns';

export function formatDateDisplay(dateStr: string): string {
  const date = parseISO(dateStr);
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const local = date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (isToday(date)) return `Today, ${local}`;
  if (isYesterday(date)) return `Yesterday, ${local}`;
  const distance = formatDistanceToNowStrict(date, {
    addSuffix: true,
  });
  return `${distance.charAt(0).toUpperCase() + distance.slice(1)}, ${local}`;
}
