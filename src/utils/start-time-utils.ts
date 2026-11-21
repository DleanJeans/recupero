/** Today's date at the given time of day (seconds since midnight), never later than `now`. */
export function startTsFromSeconds(totalSeconds: number, now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return Math.min(d.getTime() + totalSeconds * 1000, now);
}
