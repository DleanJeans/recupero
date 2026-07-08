export type EnergyLevel = 'low' | 'steady' | 'high';
export type MoodCue = 'good' | 'neutral' | 'rough';
export type LocationCue = 'home' | 'outside' | 'bed' | 'other';

export interface CueTriggerRule {
  id: string;
  sourceBehaviorId: string;
  targetBehaviorId: string;
  delayMinutes: number;
  enabled: boolean;
  createdAt: number;
}
