export type AppUsageEventType = 'resume' | 'pause' | 'screen_off';

export interface AppUsageEvent {
  packageName: string;
  type: AppUsageEventType;
  timestamp: number;
}

export interface AppUsageSession {
  packageName: string;
  start: number;
  end: number;
}
