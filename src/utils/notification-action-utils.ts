export interface NotificationActionInput {
  actionIdentifier: string;
  notificationId: string;
  /** When the notification was posted; with the id and action it names one tap. */
  notificationDate?: number;
  data: unknown;
}

/** Local notifications reach the task with their data as a JSON string (`dataString`) or as `data`. */
export function readTaskNotificationAction(payload: unknown): NotificationActionInput | null {
  if (payload == null || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const actionIdentifier = record.actionIdentifier;
  if (typeof actionIdentifier !== 'string') return null;
  const notification = record.notification as {
    date?: unknown;
    request?: { identifier?: unknown; content?: Record<string, unknown> };
  };
  const request = notification?.request;
  const content = request?.content ?? {};
  let data: unknown = content.data;
  if (data == null && typeof content.dataString === 'string') {
    try {
      data = JSON.parse(content.dataString);
    } catch {
      data = null;
    }
  }
  return {
    actionIdentifier,
    notificationId: typeof request?.identifier === 'string' ? request.identifier : '',
    notificationDate: typeof notification?.date === 'number' ? notification.date : undefined,
    data,
  };
}
