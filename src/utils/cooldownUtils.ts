export const COLORS = {
  GREEN: '#4CAF50',
  YELLOW: '#F9A825',
  RED: '#D32F2F',
  MUTED: '#888',
} as const;

export function getCooldownColor(cooldownMinutes: number, lastTimestamp: number | null | undefined): string {
  if (!lastTimestamp) return COLORS.MUTED;

  const elapsed = Date.now() - lastTimestamp;
  const elapsedMinutes = elapsed / 60_000;

  if (elapsedMinutes < cooldownMinutes) return COLORS.GREEN;

  // Red threshold: 1 order of magnitude past cooldown
  const redThresholdMinutes = cooldownMinutes < 24 * 60 ? 24 * 60 : 7 * 24 * 60;

  if (elapsedMinutes >= redThresholdMinutes) return COLORS.RED;

  return COLORS.YELLOW;
}
