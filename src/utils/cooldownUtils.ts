import type { BehaviorEntry } from '../types/behavior';
import { Colors } from './colors';

export type CooldownType = 'rest' | 'limit';

export const COLORS = {
  GREEN: Colors.cooldownGreen,
  YELLOW: Colors.cooldownYellow,
  RED: Colors.cooldownRed,
  MUTED: Colors.textMuted,
} as const;

export function getCooldownColor(behavior: BehaviorEntry): string {
  const { cooldownMinutes, lastTimestamp, cooldownType = 'rest' } = behavior;

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
