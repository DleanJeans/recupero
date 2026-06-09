import type { BehaviorType } from '../types/behavior';

const BEHAVIOR_TYPE_COLORS: Record<BehaviorType, string> = {
  undesirable: '#f87171',
  neutral: '#60a5fa',
  desirable: '#4ade80',
};

export function getBehaviorTypeColor(type: BehaviorType): string {
  return BEHAVIOR_TYPE_COLORS[type];
}
