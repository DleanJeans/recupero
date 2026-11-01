export type AppUsageEventType = 'resume' | 'pause' | 'screen_off';

export interface AppUsageEvent {
  packageName: string;
  type: AppUsageEventType;
  timestamp: number;
}

export interface AppUsageSession {
  packageName: string;
  start: number;
  end: number;
}

/** A site change seen in Firefox's address bar. An empty host means no site (new tab, home). */
export interface SiteMark {
  timestamp: number;
  host: string;
}

/** Time on one site; `host` is the site with any leading "www." removed. */
export interface SiteSession {
  host: string;
  start: number;
  end: number;
}
