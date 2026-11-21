/** Round a number to 2 decimal places, avoiding floating-point drift. */
export function roundTo2(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.round(val * 100) / 100;
}
