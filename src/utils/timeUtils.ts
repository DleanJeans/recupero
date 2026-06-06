const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCooldown(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0 || isNaN(totalMinutes)) return '';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  if (totalMinutes < 24 * 60) return `${Math.floor(totalMinutes / 60)}h`;
  if (totalMinutes < 7 * 24 * 60) return `${Math.floor(totalMinutes / (24 * 60))}d`;
  return `${Math.floor(totalMinutes / (7 * 24 * 60))}w`;
}

export function formatElapsed(timestamp: number | null): string {
  if (timestamp === null) return 'Never';

  const now = new Date();
  const date = new Date(timestamp);
  const elapsed = now.getTime() - timestamp;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const hoursAgo = ` · ${hours}h ago`;
  const daysAgo = ` · ${days}d ago`;

  if (seconds < 60) return 'Just now';
  if (hours < 1) return `${minutes}m ago`;

  const sameDay =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  if (sameDay) return `Today${hoursAgo}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return `Yesterday${hours < 24 ? hoursAgo : ''}`;

  if (days < 7) {
    return `${DAY_NAMES[date.getDay()]}${daysAgo}`;
  }

  // Check if event is in the previous calendar month
  const isLastMonth =
    (now.getMonth() === 0 && date.getFullYear() === now.getFullYear() - 1 && date.getMonth() === 11) ||
    (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() - 1);

  if (isLastMonth) {
    const w = Math.floor(days / 7);
    return `Last month · ${w}w ago`;
  }

  if (days < 14) return `Last week${daysAgo}`;

  const weeks = Math.floor(days / 7);
  if (days < 60) return `${weeks}w ago`;

  const months = Math.floor(days / 30);

  // Check if event is in the previous calendar year
  const isLastYear = date.getFullYear() === now.getFullYear() - 1 && months < 12;

  if (isLastYear) {
    return `Last year · ${months}mo ago`;
  }

  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
