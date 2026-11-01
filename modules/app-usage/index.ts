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
}

/** Android-only. `null` on iOS, web, and builds made before this module existed. */
export const AppUsage = requireOptionalNativeModule<AppUsageNativeModule>('AppUsage');
