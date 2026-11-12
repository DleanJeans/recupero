import type { BehaviorEntry } from '../types/behavior';
import type {
  BodySensationId,
  BodySensationLog,
  BuiltInBodySensationId,
  BuiltInMoodId,
  Cue,
  CueOption,
  CueRef,
  CueSourceKind,
  CueTrigger,
  CueTriggerType,
  CustomCueOptions,
  MoodId,
  MoodLog,
  SavedPlace,
} from '../types/cue';
import { Colors } from './colors';
import { iconText } from './icon-utils';
import { getLogXp } from './xp-utils';

export const MOOD_OPTIONS: ReadonlyArray<CueOption & { id: BuiltInMoodId }> = [
  { id: 'great', emoji: '😄', label: 'Great' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'okay', emoji: '😐', label: 'Okay' },
  { id: 'stressed', emoji: '😣', label: 'Stressed' },
  { id: 'low', emoji: '😔', label: 'Low' },
  { id: 'tired', emoji: '😴', label: 'Tired' },
];

export const BODY_SENSATION_OPTIONS: ReadonlyArray<CueOption & { id: BuiltInBodySensationId }> = [
  { id: 'pee', emoji: '🚽', label: 'Need to pee' },
  { id: 'hungry', emoji: '🍽️', label: 'Hungry' },
  { id: 'thirsty', emoji: '💧', label: 'Thirsty' },
  { id: 'tired', emoji: '🥱', label: 'Tired' },
  { id: 'sleepy', emoji: '😴', label: 'Sleepy' },
  { id: 'aches', emoji: '🤕', label: 'Aches' },
];

/** A body sensation counts as "current" for this long after it was logged. */
export const BODY_SENSATION_FRESH_MS = 2 * 60 * 60 * 1000;

export const CUE_TRIGGER_TYPES: CueTriggerType[] = ['location', 'time', 'habit', 'app', 'mood', 'body'];

export const NO_CUSTOM_CUE_OPTIONS: CustomCueOptions = { moods: [], sensations: [] };

/** Built-in moods followed by the ones the user added. */
export function getMoodOptions(customMoods: readonly CueOption[] = []): CueOption[] {
  return [...MOOD_OPTIONS, ...customMoods];
}

/** Built-in body sensations followed by the ones the user added. */
export function getBodySensationOptions(customSensations: readonly CueOption[] = []): CueOption[] {
  return [...BODY_SENSATION_OPTIONS, ...customSensations];
}

export function getMoodOption(mood: MoodId, customMoods: readonly CueOption[] = []): CueOption {
  return getMoodOptions(customMoods).find(option => option.id === mood) ?? MOOD_OPTIONS[2];
}

export function getBodySensationOption(
  sensation: BodySensationId,
  customSensations: readonly CueOption[] = [],
): CueOption {
  return getBodySensationOptions(customSensations).find(option => option.id === sensation) ?? BODY_SENSATION_OPTIONS[0];
}

/** Builds a new mood/sensation from the add form: trims the label and falls back to a default emoji. */
export function buildCustomCueOption(label: string, emoji: string, fallbackEmoji: string): Omit<CueOption, 'id'> {
  return { label: label.trim(), emoji: emoji.trim() || fallbackEmoji };
}

/** True when the label is empty or matches an existing option (case-insensitive). */
export function isCueOptionLabelTaken(label: string, options: readonly CueOption[]): boolean {
  const normalized = label.trim().toLowerCase();
  return options.some(option => option.label.trim().toLowerCase() === normalized);
}

export function getCueAccent(type: CueTriggerType): string {
  if (type === 'time') return Colors.star.filled;
  if (type === 'habit') return Colors.type.desirable;
  return Colors.cue[type];
}

export function isAutoTimeTrigger(trigger: CueTrigger): boolean {
  return trigger.type === 'time' && trigger.mode === 'auto';
}

export function getCueTriggerLabel(
  trigger: CueTrigger,
  places: SavedPlace[],
  behaviors: BehaviorEntry[],
  custom: CustomCueOptions = NO_CUSTOM_CUE_OPTIONS,
): string {
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
  if (trigger.type === 'app') return trigger.appLabel ? `Open ${trigger.appLabel}` : 'Open an app';
  if (trigger.type === 'body') {
    const labels = trigger.sensations.map(sensation =>
      getBodySensationOption(sensation, custom.sensations).label.toLowerCase(),
    );
    return labels.length > 0 ? `When body says ${labels.join(' or ')}` : 'When a body sensation is logged';
  }
  const labels = trigger.moods.map(mood => getMoodOption(mood, custom.moods).label);
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

export function getBodySuggestedBehaviorIds(sensation: BodySensationId, cues: Cue[]): string[] {
  const suggested = cues.flatMap(cue => {
    if (!cue.enabled) return [];
    const triggers = [cue.trigger, ...(cue.conditions ?? [])];
    const matches = triggers.some(trigger => trigger.type === 'body' && trigger.sensations.includes(sensation));
    return matches ? cue.behaviorIds : [];
  });
  return [...new Set(suggested)];
}

/** Latest body sensation, if it was logged recently enough to still be relevant. */
export function getRecentBodySensation(bodyLogs: BodySensationLog[], now = Date.now()): BodySensationLog | undefined {
  const latest = bodyLogs.reduce<BodySensationLog | undefined>(
    (current, log) => (!current || log.ts > current.ts ? log : current),
    undefined,
  );
  return latest && now - latest.ts <= BODY_SENSATION_FRESH_MS ? latest : undefined;
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
  if (type === 'body') return { type, sensations: [] };
  if (type === 'app') return { type, packageName: '', appLabel: '' };
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
  if (trigger.type === 'body') return trigger.sensations.length > 0;
  if (trigger.type === 'app') return trigger.packageName.length > 0;
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

export function placeCueRef(placeId: string): CueRef {
  return `place:${placeId}`;
}

export function moodCueRef(mood: MoodId): CueRef {
  return `mood:${mood}`;
}

export function bodyCueRef(sensation: BodySensationId): CueRef {
  return `body:${sensation}`;
}

export interface CueSource {
  ref: CueRef;
  kind: CueSourceKind;
  label: string;
  emoji?: string;
}

/** Every cue a log can be attached to: saved places, then moods, then body sensations. */
/** Emoji for a saved place in emoji-only spots (lists, pickers): the user's pick, else 🏠 for Home, else 📍. */
export function getPlaceEmoji(place: Pick<SavedPlace, 'emoji' | 'isHome'>): string {
  return place.emoji || (place.isHome ? '🏠' : '📍');
}

/** The place's icon as text, for notifications and inline labels (an image icon falls back to the pin or 🏠). */
export function getPlaceIconText(place: Pick<SavedPlace, 'emoji' | 'isHome'>): string {
  return iconText(place.emoji) || (place.isHome ? '🏠' : '📍');
}

export function getCueSources(places: SavedPlace[], custom: CustomCueOptions = NO_CUSTOM_CUE_OPTIONS): CueSource[] {
  return [
    ...places.map(place => ({
      ref: placeCueRef(place.id),
      kind: 'place' as const,
      label: place.name,
      emoji: place.emoji || undefined,
    })),
    ...getMoodOptions(custom.moods).map(option => ({
      ref: moodCueRef(option.id),
      kind: 'mood' as const,
      label: option.label,
      emoji: option.emoji,
    })),
    ...getBodySensationOptions(custom.sensations).map(option => ({
      ref: bodyCueRef(option.id),
      kind: 'body' as const,
      label: option.label,
      emoji: option.emoji,
    })),
  ];
}

export interface CueXpStats {
  xp: number;
  logCount: number;
}

/** XP and log count earned by behaviours logged with each cue. A log with two cues counts toward both. */
export function getCueXpStats(behaviors: BehaviorEntry[]): Map<CueRef, CueXpStats> {
  const stats = new Map<CueRef, CueXpStats>();
  for (const behavior of behaviors) {
    for (const log of behavior.logs) {
      if (!log.cues) continue;
      const xp = getLogXp(log);
      for (const ref of new Set(log.cues)) {
        const current = stats.get(ref) ?? { xp: 0, logCount: 0 };
        stats.set(ref, { xp: current.xp + xp, logCount: current.logCount + 1 });
      }
    }
  }
  return stats;
}

export function cueKindToTriggerType(kind: CueSourceKind): Extract<CueTriggerType, 'location' | 'mood' | 'body'> {
  return kind === 'place' ? 'location' : kind;
}
