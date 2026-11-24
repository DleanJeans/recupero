import { requireOptionalNativeModule } from 'expo';
import type { AppUsageEvent, MediaEvent, SiteMark } from '../../src/types/app-usage';

export interface LaunchableApp {
  packageName: string;
  label: string;
}

export interface ChatPic {
  id: string;
  packageName: string;
  name: string;
  updatedAt: number;
  uri: string;
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
  /** Opens an app by package name; false if it can't be opened. Missing in builds made before the Shopping timer app setting. */
  launchApp?(packageName: string): boolean;
  isSiteTrackingEnabled(): boolean;
  openAccessibilitySettings(): void;
  getSiteMarks(start: number, end: number): Promise<SiteMark[]>;
  /** JSON of the last address bar read by the watcher. Missing in builds made before the site debug view. */
  getSiteDebug?(): string;
  /** Notification access (to see media play/pause). Missing in builds made before media tracking. */
  isMediaWatchEnabled?(): boolean;
  openNotificationListenerSettings?(): void;
  getMediaEvents?(start: number, end: number): Promise<MediaEvent[]>;
  /** Who messaged you in WhatsApp or Messenger (notification titles). Missing in builds made before People auto-log. */
  getChatEvents?(start: number, end: number): Promise<{ timestamp: number; packageName: string; title: string }[]>;
  /** Cached sender pics from chat notifications, newest first. Missing in builds made before chat pics. */
  getChatPics?(): Promise<ChatPic[]>;
  /** Deletes one cached pic, or all when id is null. */
  deleteChatPic?(id: string | null): void;
  /** Copies a cached pic for a person and returns its file uri. */
  copyChatPicForPerson?(id: string): string | null;
  /** JSON array of AppOpenWatch. Missing in builds made before app-open reminders. */
  setAppOpenWatches?(json: string): void;
  /** JSON array of NeedAppOverlayWatch: apps that show the timer overlay when opened. Missing in older builds. */
  setNeedAppOverlayWatches?(json: string): void;
}

/** Android-only. `null` on iOS, web, and builds made before this module existed. */
export const AppUsage = requireOptionalNativeModule<AppUsageNativeModule>('AppUsage');
