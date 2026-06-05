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
  metadata: Record<string, string | number>;
  logs: LogEntry[];
  cooldownMinutes: number;
}
