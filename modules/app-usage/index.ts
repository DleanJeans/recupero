import { requireOptionalNativeModule } from 'expo';
import type { AppUsageEvent } from '../../src/types/app-usage';

export interface LaunchableApp {
  packageName: string;
  label: string;
}

interface AppUsageNativeModule {
  hasPermission(): boolean;
  openPermissionSettings(): void;
  queryEvents(start: number, end: number): Promise<AppUsageEvent[]>;
  getLaunchableApps(): Promise<LaunchableApp[]>;
}

/** Android-only. `null` on iOS, web, and builds made before this module existed. */
export const AppUsage = requireOptionalNativeModule<AppUsageNativeModule>('AppUsage');
