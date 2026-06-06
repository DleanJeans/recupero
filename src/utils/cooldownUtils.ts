export type CooldownType = 'rest' | 'limit';

export interface CooldownInfo {
  minutes: number;
  lastTimestamp?: number | null;
  type?: CooldownType;
}

export const COLORS = {
  GREEN: '#4CAF50',
  YELLOW: '#F9A825',
  RED: '#D32F2F',
  MUTED: '#888',
} as const;

export function toCooldownInfo(
  behavior?: {
    cooldownMinutes: number;
    lastTimestamp: number | null | undefined;
    cooldownType?: 'rest' | 'limit';
  } | null,
): CooldownInfo | undefined {
  if (!behavior || !behavior.cooldownMinutes) return undefined;
  return {
    minutes: behavior.cooldownMinutes,
    lastTimestamp: behavior.lastTimestamp,
    type: behavior.cooldownType,
  };
}

export function getCooldownColor(
  cooldownMinutes: number,
  lastTimestamp: number | null | undefined,
  cooldownType: CooldownType = 'rest',
): string {
  if (!lastTimestamp) return COLORS.MUTED;

  const elapsed = Date.now() - lastTimestamp;
  const elapsedMinutes = elapsed / 60_000;

  const withinCooldown = elapsedMinutes < cooldownMinutes;

  // rest: green within cooldown, red past order of magnitude
  // limit: red within cooldown, green past order of magnitude
  if (cooldownType === 'rest') {
    if (withinCooldown) return COLORS.GREEN;
  } else {
    if (withinCooldown) return COLORS.RED;
  }

  const redThresholdMinutes = cooldownMinutes < 24 * 60 ? 24 * 60 : 7 * 24 * 60;
  const pastThreshold = elapsedMinutes >= redThresholdMinutes;

  if (cooldownType === 'rest') {
    if (pastThreshold) return COLORS.RED;
    return COLORS.YELLOW;
  } else {
    if (pastThreshold) return COLORS.GREEN;
    return COLORS.YELLOW;
  }
}
