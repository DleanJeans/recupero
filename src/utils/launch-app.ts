import { AppUsage } from '../../modules/app-usage';

/** True on builds whose native module can open another app (older builds lack it). */
export function canLaunchApps(): boolean {
  return typeof AppUsage?.launchApp === 'function';
}

/** Opens an app by package name. Returns false when this build can't, or the app is missing. */
export function launchApp(packageName: string): boolean {
  try {
    return AppUsage?.launchApp?.(packageName) ?? false;
  } catch (error) {
    console.warn('Could not open app', packageName, error);
    return false;
  }
}

/** True when the floating timer can be drawn over other apps (the "Display over other apps" permission). */
export function canShowTimerOverlay(): boolean {
  try {
    return AppUsage?.canDrawOverlays?.() ?? false;
  } catch {
    return false;
  }
}

/** True on builds that have the floating timer at all. */
export function hasTimerOverlay(): boolean {
  return typeof AppUsage?.startTimerOverlay === 'function';
}

export function openTimerOverlaySettings(): void {
  try {
    AppUsage?.openOverlaySettings?.();
  } catch (error) {
    console.warn('Could not open overlay settings', error);
  }
}
