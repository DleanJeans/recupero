export function formatGoalNumber(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

/** "+250" / "−300" (true minus sign) / "0". */
export function formatSignedNumber(value: number): string {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '−'}${formatGoalNumber(Math.abs(value))}`;
}

/** First letter of the weekday for a YYYY-MM-DD date, e.g. "M". */
export function formatWeekdayInitial(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' });
}
