/** A cell rectangle on the floor plan grid (TIDY_PLAN_COLUMNS wide). */
export interface TidyRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A room (or corner) of the home that holds spots, e.g. Kitchen. */
export interface TidyRoom {
  id: string;
  name: string;
  emoji: string;
  /** Where the room's tile sits on the floor plan. */
  rect: TidyRect;
}

/** How much a spot counts toward overall Tidiness. */
export type TidyWeight = 1 | 2 | 3;

/** One place that gets messy on its own, e.g. Kitchen sink. Works like a small need. */
export interface TidySpot {
  id: string;
  roomId: string;
  name: string;
  emoji: string;
  /** Hours from spotless (100%) to a mess (0%). Learned from check-ins. */
  emptyHours: number;
  weight: TidyWeight;
  /** Logging any of these behaviours cleans the spot (sets it to 100%). */
  behaviorIds: string[];
  /** Pin position inside the room tile, 0-1 on each axis. Undefined = placed automatically. */
  pin?: { x: number; y: number };
  /** Check-ins that moved `emptyHours` since the spot was made. */
  learnedFrom: number;
  createdAt: number;
}

/** A tap on the spot: marked clean (level 100) or a "How is it now?" check-in. */
export interface TidyMark {
  id: string;
  spotId: string;
  ts: number;
  level: number;
  checkIn: boolean;
}
