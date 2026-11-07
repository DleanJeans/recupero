import type { BehaviorEntry } from '../types/behavior';
import type { CravingLog, CravingOutcome, UrgeLevel } from '../types/craving';

/** Cravings usually peak and fade within 10 to 15 minutes, so a ride lasts 10 minutes. */
export const DEFAULT_RIDE_MS = 10 * 60_000;

const WEEK_MS = 7 * 24 * 60 * 60_000;

export const URGE_LEVELS: Array<{ level: UrgeLevel; label?: string }> = [
  { level: 1, label: 'faint' },
  { level: 2 },
  { level: 3, label: 'steady' },
  { level: 4 },
  { level: 5, label: 'intense' },
];

export const CRAVING_OUTCOME_LABELS: Record<CravingOutcome, string> = {
  resisted: 'Rode it out',
  redirected: 'Redirected',
  gaveIn: 'Gave in',
};

/** The most recent craving that hasn't ended yet, if any. */
export function getActiveCraving(cravings: CravingLog[]): CravingLog | undefined {
  return cravings.reduce<CravingLog | undefined>(
    (latest, craving) =>
      craving.outcome == null && (!latest || craving.startedAt > latest.startedAt) ? craving : latest,
    undefined,
  );
}

export function getRideRemainingMs(craving: CravingLog, now = Date.now()): number {
  return Math.max(0, craving.startedAt + craving.rideMs - now);
}

export function getLatestUrge(craving: CravingLog): UrgeLevel | undefined {
  return craving.ratings[craving.ratings.length - 1]?.level;
}

export function getPeakUrge(craving: CravingLog): UrgeLevel | undefined {
  if (craving.ratings.length === 0) return undefined;
  return Math.max(...craving.ratings.map(rating => rating.level)) as UrgeLevel;
}

export function isCravingBeaten(outcome: CravingOutcome | undefined): boolean {
  return outcome === 'resisted' || outcome === 'redirected';
}

export interface CravingAlternative {
  behavior: BehaviorEntry;
  /** Times a craving for this behaviour was redirected to the alternative. */
  redirectCount: number;
  /** Whether the user added it to the craved behaviour's "Instead, try…" list. */
  isPicked: boolean;
}

/**
 * Alternatives to suggest while riding out a craving: the ones picked on the behaviour form,
 * plus any behaviour a past craving for it was redirected to. Most-used first, then picked order.
 */
export function getCravingAlternatives(
  behaviorId: string,
  behaviors: BehaviorEntry[],
  cravings: CravingLog[],
  alternatives: Record<string, string[]>,
): CravingAlternative[] {
  const picked = alternatives[behaviorId] ?? [];
  const redirectCounts = new Map<string, number>();
  for (const craving of cravings) {
    if (craving.behaviorId !== behaviorId || craving.outcome !== 'redirected' || !craving.redirectBehaviorId) continue;
    redirectCounts.set(craving.redirectBehaviorId, (redirectCounts.get(craving.redirectBehaviorId) ?? 0) + 1);
  }
  const ids = [...new Set([...picked, ...redirectCounts.keys()])].filter(id => id !== behaviorId);
  const behaviorById = new Map(behaviors.map(behavior => [behavior.id, behavior]));
  return ids
    .map(id => {
      const behavior = behaviorById.get(id);
      if (!behavior) return undefined;
      return { behavior, redirectCount: redirectCounts.get(id) ?? 0, isPicked: picked.includes(id) };
    })
    .filter((alternative): alternative is CravingAlternative => alternative != null)
    .sort((a, b) => {
      if (b.redirectCount !== a.redirectCount) return b.redirectCount - a.redirectCount;
      if (a.isPicked !== b.isPicked) return a.isPicked ? -1 : 1;
      return picked.indexOf(a.behavior.id) - picked.indexOf(b.behavior.id);
    });
}

/** Behaviours that could replace a craving: anything not undesirable, matching the query, most recent first. */
export function searchAlternativeBehaviors(
  query: string,
  behaviors: BehaviorEntry[],
  excludeIds: string[],
  hidePrivate = false,
): BehaviorEntry[] {
  const q = query.trim().toLowerCase();
  return behaviors
    .filter(behavior => behavior.type !== 'undesirable' && !excludeIds.includes(behavior.id))
    .filter(behavior => !hidePrivate || !behavior.private)
    .filter(behavior => !q || behavior.name.toLowerCase().includes(q))
    .sort((a, b) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0));
}

/**
 * Behaviours listed on the Cravings tab: every undesirable behaviour plus anything craved before.
 * Most recently craved first, then most recently done.
 */
export function getCravableBehaviors(
  behaviors: BehaviorEntry[],
  cravings: CravingLog[],
  hidePrivate = false,
): BehaviorEntry[] {
  const lastCravedAt = new Map<string, number>();
  for (const craving of cravings) {
    lastCravedAt.set(craving.behaviorId, Math.max(lastCravedAt.get(craving.behaviorId) ?? 0, craving.startedAt));
  }
  return behaviors
    .filter(behavior => behavior.type === 'undesirable' || lastCravedAt.has(behavior.id))
    .filter(behavior => !hidePrivate || !behavior.private)
    .sort((a, b) => {
      const cravedDiff = (lastCravedAt.get(b.id) ?? 0) - (lastCravedAt.get(a.id) ?? 0);
      return cravedDiff || (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0);
    });
}

export interface CravingWeekStats {
  /** Resisted or redirected. */
  beaten: number;
  gaveIn: number;
}

/** Ended cravings from the last 7 days, optionally for one behaviour. */
export function getCravingWeekStats(cravings: CravingLog[], now = Date.now(), behaviorId?: string): CravingWeekStats {
  const stats: CravingWeekStats = { beaten: 0, gaveIn: 0 };
  for (const craving of cravings) {
    if (behaviorId && craving.behaviorId !== behaviorId) continue;
    if (craving.outcome == null || craving.startedAt < now - WEEK_MS) continue;
    if (craving.outcome === 'gaveIn') stats.gaveIn += 1;
    else stats.beaten += 1;
  }
  return stats;
}

/** Ended cravings, newest first. */
export function getRecentCravings(cravings: CravingLog[], limit = 10): CravingLog[] {
  return cravings
    .filter(craving => craving.outcome != null)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit);
}
