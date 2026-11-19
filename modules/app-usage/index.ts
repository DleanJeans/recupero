import { requireOptionalNativeModule } from 'expo';
import type { AppUsageEvent, MediaEvent, SiteMark } from '../../src/types/app-usage';

export interface LaunchableApp {
  packageName: string;
  label: string;
}

interface AppUsageNativeModule {
  hasPermission(): boolean;
  openPermissionSettings(): void;
  queryEvents(start: number, end: number): Promise<AppUsageEvent[]>;
  /** file:// uri of the app's icon. Missing in builds made before app icons. */
  getAppIcon?(packageName: string): Promise<string | null>;
  /** Missing in builds made before the timer overlay. */
  canDrawOverlays?(): boolean;
  openOverlaySettings?(): void;
  startTimerOverlay?(timersJson: string, visible: boolean): void;
  setTimerOverlayVisible?(visible: boolean): void;
  stopTimerOverlay?(): void;
  getLaunchableApps(): Promise<LaunchableApp[]>;
  isSiteTrackingEnabled(): boolean;
  openAccessibilitySettings(): void;
  getSiteMarks(start: number, end: number): Promise<SiteMark[]>;
  /** Notification access (to see media play/pause). Missing in builds made before media tracking. */
  isMediaWatchEnabled?(): boolean;
  openNotificationListenerSettings?(): void;
  getMediaEvents?(start: number, end: number): Promise<MediaEvent[]>;
  /** JSON array of AppOpenWatch. Missing in builds made before app-open reminders. */
  setAppOpenWatches?(json: string): void;
}

/** Android-only. `null` on iOS, web, and builds made before this module existed. */
export const AppUsage = requireOptionalNativeModule<AppUsageNativeModule>('AppUsage');
