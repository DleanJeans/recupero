import { requireOptionalNativeModule } from 'expo';
import type { AppUsageEvent, SiteMark } from '../../src/types/app-usage';

export interface LaunchableApp {
  packageName: string;
  label: string;
}

interface AppUsageNativeModule {
  hasPermission(): boolean;
  openPermissionSettings(): void;
  queryEvents(start: number, end: number): Promise<AppUsageEvent[]>;
  getLaunchableApps(): Promise<LaunchableApp[]>;
  isSiteTrackingEnabled(): boolean;
  openAccessibilitySettings(): void;
  getSiteMarks(start: number, end: number): Promise<SiteMark[]>;
  /** JSON array of AppOpenWatch. Missing in builds made before app-open reminders. */
  setAppOpenWatches?(json: string): void;
}

/** Android-only. `null` on iOS, web, and builds made before this module existed. */
export const AppUsage = requireOptionalNativeModule<AppUsageNativeModule>('AppUsage');
