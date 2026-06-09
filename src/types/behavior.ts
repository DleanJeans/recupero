export interface Category {
  id: string;
  name: string;
  emoji: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  metadata?: Record<string, string | number>;
}

export type BehaviorType = 'undesirable' | 'neutral' | 'desirable';

export interface BehaviorEntry {
  id: string;
  name: string;
  type: BehaviorType;
  icon?:
    | string
    | {
        uri: string;
      };
  categoryId?: string;
  private?: boolean;
  lastTimestamp: number | null;
  metadata: Record<string, string | number>;
  logs: LogEntry[];
  cooldownMinutes: number;
  cooldownType?: 'rest' | 'limit';
  cooldownUnit?: 'minutes' | 'hours' | 'days' | 'weeks';
}
