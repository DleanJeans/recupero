import { requireOptionalNativeModule } from 'expo';

interface SunlightNotificationNativeModule {
  /** JSON SunlightNotificationPlan. False when Android only allowed a still notification. */
  start(json: string): boolean;
  stop(): void;
  /** True on builds whose notification can show a pause (`pausedUntil` in the plan). Missing on older builds. */
  supportsPause?(): boolean;
}

/** Android-only. `null` on iOS, web, and builds made before this module existed (OTA onto an older APK). */
export const SunlightNotification =
  requireOptionalNativeModule<SunlightNotificationNativeModule>('SunlightNotification');
