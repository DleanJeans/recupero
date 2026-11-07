import type { CueRef } from './cue';

/** How strong an urge feels, from 1 (faint) to 5 (intense). */
export type UrgeLevel = 1 | 2 | 3 | 4 | 5;

/**
 * How a craving ended.
 * - resisted: rode it out without doing the behaviour
 * - redirected: did an alternative behaviour instead
 * - gaveIn: did the craved behaviour
 */
export type CravingOutcome = 'resisted' | 'redirected' | 'gaveIn';

export interface UrgeRating {
  ts: number;
  level: UrgeLevel;
}

/** One urge to do a behaviour, ridden out with the "Ride it out" timer. */
export interface CravingLog {
  id: string;
  /** The behaviour the user felt like doing. */
  behaviorId: string;
  startedAt: number;
  /** Length of the ride-it-out timer when this craving started. */
  rideMs: number;
  /** Urge ratings in the order they were given. */
  ratings: UrgeRating[];
  /** Cues (place, mood, body sensation) that set the craving off. */
  cues?: CueRef[];
  /** Undefined while the craving is still being ridden out. */
  outcome?: CravingOutcome;
  endedAt?: number;
  /** The alternative behaviour done instead, when outcome is 'redirected'. */
  redirectBehaviorId?: string;
}
