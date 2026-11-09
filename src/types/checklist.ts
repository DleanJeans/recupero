/** One line of a checklist: a behaviour (ticking it logs it) or a plain item that is only ticked. */
export type ChecklistItem =
  | { id: string; kind: 'behavior'; behaviorId: string }
  | { id: string; kind: 'plain'; label: string };

/** A saved, named group of behaviours run like a checklist (Morning routine, Night routine, Going out). */
export interface Checklist {
  id: string;
  name: string;
  emoji?: string;
  items: ChecklistItem[];
  createdAt: number;
  /** When the checklist was last finished (all items ticked or skipped, or Finish pressed). */
  lastCompletedAt?: number;
}

export interface ChecklistTick {
  at: number;
  /** The log created when a behaviour item was ticked. Undefined for plain items and skips. */
  logId?: string;
  behaviorId?: string;
  skipped?: boolean;
}

/** Today's progress through one checklist. Replaced by a fresh run on a new day. */
export interface ChecklistRun {
  /** Operational day (YYYY-MM-DD, respecting the day cutoff) this run belongs to. */
  date: string;
  startedAt: number;
  /** Shared by every log ticked in this run, so the Day timeline groups them as one stack. */
  stackId: string;
  ticks: Record<string, ChecklistTick>;
  /** Set when the run was finished. Cleared again if an item is unticked. */
  finishedAt?: number;
}

export type ChecklistItemInput = { kind: 'behavior'; behaviorId: string } | { kind: 'plain'; label: string };
