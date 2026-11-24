import type { NeedId } from './need';

/**
 * A behaviour the user copes with, tracked as an urge that builds up since the last time it was done
 * (a need in reverse: it fills over time and drops to 0 when the behaviour is logged).
 */
export interface CopingUrge {
  behaviorId: string;
  /** When it was added; the bar starts from here when the behaviour was never logged. */
  addedAt: number;
  /** Hours from 0% to 100%. Undefined = learned from the median gap between logs. */
  fullInHours?: number;
  /** Level (0-100) where the urge counts as "past your line". */
  line: number;
  /** How much a craving ridden out without giving in lowers the bar, in percentage points. */
  resistDrop: number;
  /** The need this behaviour stands in for, e.g. Marvel Rivals copes for Fun. */
  copesFor?: NeedId;
}

/** How the Cravings tab lays out urges and needs: one board, or urges grouped under the need they cope for. */
export type CravingsView = 'board' | 'byNeed';
