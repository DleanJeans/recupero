/** Formats a number with at most `digits` decimals and no trailing zeros ("0.80" -> "0.8"). */
function trimNumber(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)));
}

/** Minutes of use that fill a need from 0 to 100% -> percent filled per minute. '' when it isn't a positive number. */
export function percentPerMinuteFromMinutes(minutes: number | null | undefined): string {
  return minutes != null && minutes > 0 ? trimNumber(100 / minutes, 3) : '';
}

/** Percent filled per minute -> minutes to fill 0 to 100%. '' when it isn't a positive number. */
export function minutesFromPercentPerMinute(percent: number | null | undefined): string {
  return percent != null && percent > 0 ? trimNumber(100 / percent, 2) : '';
}
