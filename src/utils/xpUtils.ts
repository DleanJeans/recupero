export const XP_PER_LOG = 5;
export const XP_PER_LEVEL = 100;

export function getXp(logCount: number): number {
  return logCount * XP_PER_LOG;
}

export function getLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL);
}

/** Progress within the current level (0–1). */
export function getLevelProgress(xp: number): number {
  return (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
}

/** XP remaining until the next level. */
export function getXpToNextLevel(xp: number): number {
  return XP_PER_LEVEL - (xp % XP_PER_LEVEL);
}
