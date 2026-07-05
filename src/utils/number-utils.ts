/** Round a number to 2 decimal places, avoiding floating-point drift. */
export function roundTo2(val: number): number {
  return Math.round(val * 100) / 100;
}
