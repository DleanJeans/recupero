/** Where the app found the phone when it checked (app opened or brought back), so a missed geofence event can't count all day. */
export interface SunlightPresenceSample {
  ts: number;
  /** The tracked place the phone was inside, or null if it was away from all of them. */
  placeId: string | null;
  /** Rounded position, used to work out sunrise and sunset where you are. */
  lat?: number;
  lng?: number;
}

/** Arriving at or leaving an indoor place, from sunlight's own geofences. */
export interface SunlightGeofenceEvent {
  ts: number;
  kind: 'enter' | 'exit';
  placeId: string;
}

/** Hourly sunshine from the weather service: mean W/m² on flat ground over the hour ending at `ts`. */
export interface SunlightWeatherHour {
  ts: number;
  wm2: number;
}

/** A lux-meter calibration that applies from `from` onwards (until the next step). */
export interface SunlightCalibrationStep {
  from: number;
  /** Multiplier on the weather estimate; 1 = as estimated. */
  factor: number;
}

export interface SunlightWeather {
  fetchedAt: number;
  lat: number;
  lng: number;
  hours: SunlightWeatherHour[];
  /** Calibration history attached in memory (never stored with the fetched weather). */
  calibration?: SunlightCalibrationStep[];
}

export interface SunlightRange {
  start: number;
  end: number;
}

/** A stretch of time away from tracked places while the sun was up. */
export interface SunlightStretch extends SunlightRange {
  /** Estimated outdoor illuminance from the weather, if known. */
  lux?: number;
  /** Still going (you're out now and the sun is up). */
  ongoing: boolean;
}

export interface SunlightDay {
  dayStart: number;
  /** Whether there's a position to work out the sun from (a saved place or a location check). */
  located: boolean;
  minutes: number;
  stretches: SunlightStretch[];
  sunrise?: number;
  sunset?: number;
  /** Sun up all day or down all day (far north or south). */
  polar?: 'day' | 'night';
  /** Minute-weighted average lux across the stretches, if the weather is known. */
  lux?: number;
  /** Light dose: eye-level lux × minutes summed over the stretches (0 where the weather is unknown). */
  luxMinutes: number;
}
