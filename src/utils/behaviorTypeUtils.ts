import type { BehaviorType } from '../types/behavior';
import { Colors } from './colors';

const BEHAVIOR_TYPE_COLORS: Record<BehaviorType, string> = {
  undesirable: Colors.typeUndesirable,
  neutral: Colors.typeNeutral,
  desirable: Colors.typeDesirable,
};

export function getBehaviorTypeColor(type: BehaviorType): string {
  return BEHAVIOR_TYPE_COLORS[type];
}
