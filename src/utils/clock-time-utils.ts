const pad = (n: number) => String(n).padStart(2, '0');

/** "HH:mm" or "HH:mm:ss" for a time of day. */
export function formatClockTime(hour: number, minute: number, second: number, showSeconds: boolean): string {
  return showSeconds ? `${pad(hour)}:${pad(minute)}:${pad(second)}` : `${pad(hour)}:${pad(minute)}`;
}
