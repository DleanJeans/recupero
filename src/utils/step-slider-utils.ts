/** Snaps a value to the nearest step from `min` and keeps it within [min, max]. */
export function clampToStep(value: number, min: number, max: number, step: number): number {
  const snapped = min + Math.round((value - min) / step) * step;
  return Math.max(min, Math.min(max, snapped));
}

export function stepValue(value: number, direction: 1 | -1, min: number, max: number, step: number): number {
  return clampToStep(value + direction * step, min, max, step);
}
