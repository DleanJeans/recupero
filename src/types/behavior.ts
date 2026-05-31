import type { MetadataField } from './metadata';

export interface LogEntry {
  id: string;
  timestamp: number;
  metadata?: Record<string, string | number>; // Maps metadata field ID to its value for this log
}

export interface BehaviorEntry {
  id: string;
  name: string;
  icon?:
    | string
    | {
        uri: string;
      };
  lastTimestamp: number | null;
  metadata: MetadataField[]; // Both global and log-scoped metadata fields
  logs: LogEntry[];
}
