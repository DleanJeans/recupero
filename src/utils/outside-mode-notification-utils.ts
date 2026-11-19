export const OUTSIDE_MODE_NOTIFICATION_ID = 'sunlight-outside-mode';
export const OUTSIDE_MODE_NOTIFICATION_KIND = 'outside-mode';
export const OUTSIDE_MODE_STOP_ACTION_ID = 'outside-mode-stop';
export const OUTSIDE_MODE_CATEGORY = 'outside-mode';

export interface OutsideModeNotificationData {
  kind: typeof OUTSIDE_MODE_NOTIFICATION_KIND;
  [key: string]: unknown;
}

export function isOutsideModeNotificationData(data: unknown): data is OutsideModeNotificationData {
  return typeof data === 'object' && data !== null && (data as { kind?: unknown }).kind === OUTSIDE_MODE_NOTIFICATION_KIND;
}
