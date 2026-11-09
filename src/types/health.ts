/** One sleep session from Google Health (Fitbit), main sleep or nap. */
export interface HealthSleep {
  /** Data point name, e.g. "users/me/dataTypes/sleep/dataPoints/123". Stable across syncs. */
  id: string;
  start: number;
  end: number;
  asleepMinutes: number;
  awakeMinutes?: number;
  deepMinutes?: number;
  lightMinutes?: number;
  remMinutes?: number;
}

/** Active Zone Minutes earned on one calendar day ("YYYY-MM-DD"). */
export interface HealthAzmDay {
  day: string;
  minutes: number;
}

export interface HealthTokens {
  accessToken: string;
  refreshToken?: string;
  /** When the access token stops working, in ms. */
  expiresAt: number;
}
