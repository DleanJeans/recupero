import type { BehaviorEntry, LogEntry } from '../types/behavior';
import type { Cue, CueRef, CueTrigger, SavedPlace } from '../types/cue';
import { getCueTriggerLabel, placeCueRef } from './cue-utils';
import { getLogEndTimestamp } from './log-utils';

/** Android geofencing is unreliable below roughly 100 m, so reminder geofences never go smaller. */
export const GEOFENCE_MIN_RADIUS_M = 100;
/** Same reminder won't fire twice within this window (geofences flap at the edge). */
export const REMINDER_COOLDOWN_MS = 15 * 60 * 1000;
/** Logs older than this when they first appear (imports, back-dated logs) don't start habit reminders. */
export const FRESH_LOG_WINDOW_MS = 15 * 60 * 1000;
/** Android shows at most three action buttons on a notification. */
export const MAX_NOTIFICATION_ACTIONS = 3;
export const TIME_REMINDER_ID_PREFIX = 'reminder-time:';

export interface TimeReminderSchedule {
  identifier: string;
  cueId: string;
  /** 1 = Sunday … 7 = Saturday (expo-notifications weekly trigger). Null = every day. */
  weekday: number | null;
  hour: number;
  minute: number;
}

export interface ReminderGeofenceRegion {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
}

export interface ReminderNotificationData {
  kind: 'reminder';
  cueId: string;
  behaviorIds: string[];
  cueRef?: CueRef;
  [key: string]: unknown;
}

/** Whether the app can fire this trigger on its own (rather than only showing suggestions in-app). */
export function canTriggerFireAutomatically(trigger: CueTrigger): boolean {
  if (trigger.type === 'location' || trigger.type === 'habit') return true;
  if (trigger.type === 'time') return trigger.mode === 'simple' || trigger.pattern === 'afterBehavior';
  return false;
}

/** Enabled reminders with push on whose trigger the app can fire automatically. */
export function getActivePushReminders(cues: Cue[]): Cue[] {
  return cues.filter(
    cue => cue.enabled && cue.notify.push && cue.behaviorIds.length > 0 && canTriggerFireAutomatically(cue.trigger),
  );
}

export function geofenceRadius(radiusM: number): number {
  return Math.max(GEOFENCE_MIN_RADIUS_M, radiusM);
}

export function getTimeReminderSchedules(cues: Cue[]): TimeReminderSchedule[] {
  return getActivePushReminders(cues).flatMap<TimeReminderSchedule>(cue => {
    const trigger = cue.trigger;
    if (trigger.type !== 'time' || trigger.mode !== 'simple') return [];
    const [hour, minute] = trigger.at.split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return [];
    const days = [...new Set(trigger.repeatDays)].filter(day => day >= 0 && day <= 6).sort((a, b) => a - b);
    if (days.length === 0 || days.length === 7) {
      return [{ identifier: `${TIME_REMINDER_ID_PREFIX}${cue.id}:daily`, cueId: cue.id, weekday: null, hour, minute }];
    }
    return days.map(day => ({
      identifier: `${TIME_REMINDER_ID_PREFIX}${cue.id}:${day}`,
      cueId: cue.id,
      weekday: day + 1,
      hour,
      minute,
    }));
  });
}

/** One geofence per saved place that an active enter/exit reminder points at. */
export function getReminderGeofenceRegions(cues: Cue[], places: SavedPlace[]): ReminderGeofenceRegion[] {
  const directions = new Map<string, { enter: boolean; exit: boolean }>();
  for (const cue of getActivePushReminders(cues)) {
    if (cue.trigger.type !== 'location') continue;
    const current = directions.get(cue.trigger.placeId) ?? { enter: false, exit: false };
    current[cue.trigger.direction] = true;
    directions.set(cue.trigger.placeId, current);
  }
  return places.flatMap(place => {
    const direction = directions.get(place.id);
    if (!direction) return [];
    return [
      {
        identifier: place.id,
        latitude: place.lat,
        longitude: place.lng,
        radius: geofenceRadius(place.radiusM),
        notifyOnEnter: direction.enter,
        notifyOnExit: direction.exit,
      },
    ];
  });
}

export function getRemindersForGeofenceEvent(cues: Cue[], placeId: string, direction: 'enter' | 'exit'): Cue[] {
  return getActivePushReminders(cues).filter(
    cue => cue.trigger.type === 'location' && cue.trigger.placeId === placeId && cue.trigger.direction === direction,
  );
}

/** Reminders that start counting down when `behaviorId` is logged, with their delay in minutes. */
export function getRemindersForLoggedBehavior(cues: Cue[], behaviorId: string): Array<{ cue: Cue; delayMin: number }> {
  return getActivePushReminders(cues).flatMap(cue => {
    const trigger = cue.trigger;
    if (trigger.type === 'habit' && trigger.behaviorId === behaviorId) {
      return [{ cue, delayMin: Math.max(0, trigger.delayMin ?? 0) }];
    }
    if (trigger.type === 'time' && trigger.mode === 'auto' && trigger.pattern === 'afterBehavior') {
      if (trigger.behaviorId === behaviorId) return [{ cue, delayMin: Math.max(0, trigger.delayMin) }];
    }
    return [];
  });
}

/** Logs that are in `next` but weren't in `previous`, and were logged just now (not imported or back-dated). */
export function getNewlyLoggedBehaviors(
  previous: BehaviorEntry[],
  next: BehaviorEntry[],
  now = Date.now(),
): Array<{ behaviorId: string; log: LogEntry }> {
  const previousIds = new Set(previous.flatMap(behavior => behavior.logs.map(log => log.id)));
  return next.flatMap(behavior =>
    behavior.logs
      .filter(
        log =>
          !previousIds.has(log.id) && log.source == null && now - getLogEndTimestamp(log) <= FRESH_LOG_WINDOW_MS,
      )
      .map(log => ({ behaviorId: behavior.id, log })),
  );
}

export function isReminderOnCooldown(lastFiredAt: number | undefined, now = Date.now()): boolean {
  return lastFiredAt != null && now - lastFiredAt < REMINDER_COOLDOWN_MS;
}

export function getReminderCueRef(cue: Cue): CueRef | undefined {
  return cue.trigger.type === 'location' ? placeCueRef(cue.trigger.placeId) : undefined;
}

export function getReminderNotificationContent(
  cue: Cue,
  places: SavedPlace[],
  behaviors: BehaviorEntry[],
): { title: string; body: string; data: ReminderNotificationData; actions: Array<{ id: string; title: string }> } {
  const suggested = cue.behaviorIds
    .map(id => behaviors.find(behavior => behavior.id === id))
    .filter((behavior): behavior is BehaviorEntry => behavior != null);
  const names = suggested.map(behavior => behavior.name);
  const title = cue.name?.trim() || getCueTriggerLabel(cue.trigger, places, behaviors);
  const body =
    names.length === 0
      ? 'Tap to open Recupero.'
      : names.length === 1
        ? `Time for ${names[0]}? Tap to log it.`
        : `Try ${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}.`;
  const actions =
    suggested.length > 1
      ? suggested.slice(0, MAX_NOTIFICATION_ACTIONS).map(behavior => ({ id: `log:${behavior.id}`, title: behavior.name }))
      : [];
  return {
    title,
    body,
    data: { kind: 'reminder', cueId: cue.id, behaviorIds: suggested.map(behavior => behavior.id), cueRef: getReminderCueRef(cue) },
    actions,
  };
}

/** Changes whenever something that affects scheduled notifications or geofences changes. */
export function getReminderScheduleSignature(cues: Cue[], places: SavedPlace[], behaviors: BehaviorEntry[]): string {
  const active = getActivePushReminders(cues);
  const behaviorIds = new Set(active.flatMap(cue => cue.behaviorIds));
  const placeIds = new Set(active.flatMap(cue => (cue.trigger.type === 'location' ? [cue.trigger.placeId] : [])));
  return JSON.stringify({
    active,
    places: places.filter(place => placeIds.has(place.id)),
    behaviors: behaviors.filter(behavior => behaviorIds.has(behavior.id)).map(behavior => [behavior.id, behavior.name]),
  });
}

export function isReminderNotificationData(data: unknown): data is ReminderNotificationData {
  if (data == null || typeof data !== 'object') return false;
  const value = data as Partial<ReminderNotificationData>;
  return value.kind === 'reminder' && typeof value.cueId === 'string' && Array.isArray(value.behaviorIds);
}
