import type { BehaviorEntry } from '../types/behavior';
import type { Cue, CueTrigger, CueTriggerType, MoodId, MoodLog, SavedPlace } from '../types/cue';
import { Colors } from './colors';

export const MOOD_OPTIONS: ReadonlyArray<{ id: MoodId; emoji: string; label: string }> = [
  { id: 'great', emoji: '😄', label: 'Great' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'okay', emoji: '😐', label: 'Okay' },
  { id: 'stressed', emoji: '😣', label: 'Stressed' },
  { id: 'low', emoji: '😔', label: 'Low' },
  { id: 'tired', emoji: '😴', label: 'Tired' },
];

export const CUE_TRIGGER_TYPES: CueTriggerType[] = ['location', 'time', 'habit', 'mood'];

export function getMoodOption(mood: MoodId) {
  return MOOD_OPTIONS.find(option => option.id === mood) ?? MOOD_OPTIONS[2];
}

export function getCueAccent(type: CueTriggerType): string {
  if (type === 'time') return Colors.star.filled;
  if (type === 'habit') return Colors.type.desirable;
  return Colors.cue[type];
}

export function isAutoTimeTrigger(trigger: CueTrigger): boolean {
  return trigger.type === 'time' && trigger.mode === 'auto';
}

export function getCueTriggerLabel(trigger: CueTrigger, places: SavedPlace[], behaviors: BehaviorEntry[]): string {
  if (trigger.type === 'location') {
    const place = places.find(item => item.id === trigger.placeId)?.name ?? 'Unknown place';
    return `${trigger.direction === 'enter' ? 'Enter' : 'Leave'} ${place}`;
  }
  if (trigger.type === 'time') {
    if (trigger.mode === 'simple') return `At ${trigger.at}`;
    if (trigger.pattern === 'wakeup') return 'When wake-up is detected';
    const behavior = behaviors.find(item => item.id === trigger.behaviorId)?.name ?? 'a behaviour';
    return `${trigger.delayMin} min after ${behavior}`;
  }
  if (trigger.type === 'habit') {
    const behavior = behaviors.find(item => item.id === trigger.behaviorId)?.name ?? 'a behaviour';
    return `${trigger.delayMin ? `${trigger.delayMin} min after` : 'After logging'} ${behavior}`;
  }
  const labels = trigger.moods.map(mood => getMoodOption(mood).label);
  return labels.length > 0 ? `When feeling ${labels.join(' or ')}` : 'When mood is logged';
}

export function getCueBehaviorLabel(behaviorIds: string[], behaviors: BehaviorEntry[]): string {
  const names = behaviorIds
    .map(id => behaviors.find(behavior => behavior.id === id)?.name)
    .filter((name): name is string => name != null);
  if (names.length === 0) return 'Choose behaviours';
  if (names.length <= 2) return names.join(' + ');
  return `${names[0]} + ${names.length - 1} more`;
}

export function getMoodSuggestedBehaviorIds(mood: MoodId, cues: Cue[]): string[] {
  const suggested = cues.flatMap(cue => {
    if (!cue.enabled) return [];
    const triggers = [cue.trigger, ...(cue.conditions ?? [])];
    const matches = triggers.some(trigger => trigger.type === 'mood' && trigger.moods.includes(mood));
    return matches ? cue.behaviorIds : [];
  });
  return [...new Set(suggested)];
}

export function getCurrentMood(moodLogs: MoodLog[]): MoodLog | undefined {
  return moodLogs.reduce<MoodLog | undefined>(
    (latest, log) => (!latest || log.ts > latest.ts ? log : latest),
    undefined,
  );
}

interface DefaultCueTriggerOptions {
  placeId?: string;
  behaviorId?: string;
  now?: Date;
}

export function createDefaultCueTrigger(
  type: CueTriggerType,
  { placeId = '', behaviorId = '', now = new Date() }: DefaultCueTriggerOptions = {},
): CueTrigger {
  if (type === 'location') return { type, placeId, direction: 'enter' };
  if (type === 'habit') return { type, behaviorId };
  if (type === 'mood') return { type, moods: [] };
  return {
    type,
    mode: 'simple',
    at: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    repeatDays: [0, 1, 2, 3, 4, 5, 6],
  };
}

export function isCueTriggerComplete(trigger: CueTrigger): boolean {
  if (trigger.type === 'location') return trigger.placeId.length > 0;
  if (trigger.type === 'habit') return trigger.behaviorId.length > 0;
  if (trigger.type === 'mood') return trigger.moods.length > 0;
  if (trigger.mode === 'simple') return /^([01]\d|2[0-3]):[0-5]\d$/.test(trigger.at) && trigger.repeatDays.length > 0;
  if (trigger.pattern === 'afterBehavior') return trigger.behaviorId.length > 0 && trigger.delayMin >= 0;
  return true;
}

export function dateFromCueTime(at: string): Date {
  const [hour = 0, minute = 0] = at.split(':').map(Number);
  return new Date(2000, 0, 1, hour, minute);
}

export function cueTimeFromDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
