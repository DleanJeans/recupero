import { requireOptionalNativeModule } from 'expo';

interface SunlightNotificationNativeModule {
  /** JSON SunlightNotificationPlan. False when Android only allowed a still notification. */
  start(json: string): boolean;
  stop(): void;
}

/** Android-only. `null` on iOS, web, and builds made before this module existed (OTA onto an older APK). */
export const SunlightNotification =
  requireOptionalNativeModule<SunlightNotificationNativeModule>('SunlightNotification');
