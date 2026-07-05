import type { BehaviorType } from '../types/behavior';
import { Colors } from './colors';

const BEHAVIOR_TYPE_COLORS: Record<BehaviorType, string> = {
  undesirable: Colors.type.undesirable,
  neutral: Colors.type.neutral,
  desirable: Colors.type.desirable,
};

export function getBehaviorTypeColor(type: BehaviorType): string {
  return BEHAVIOR_TYPE_COLORS[type];
}
