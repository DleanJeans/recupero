import type { MetadataField } from './metadata';

export interface LogEntry {
  id: string;
  timestamp: number;
  metadata?: Record<string, string | number>;
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
  metadata: MetadataField[];
  logs: LogEntry[];
}
