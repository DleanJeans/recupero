/** Track position (0-1) to value, with `center` at the middle when given. */
export function sliderValueAt(ratio: number, min: number, max: number, center?: number): number {
  const r = Math.min(1, Math.max(0, ratio));
  if (center == null) return min + r * (max - min);
  return r <= 0.5 ? min + (r / 0.5) * (center - min) : center + ((r - 0.5) / 0.5) * (max - center);
}

/** Value to track position (0-1); the inverse of sliderValueAt. */
export function sliderRatioOf(value: number, min: number, max: number, center?: number): number {
  const v = Math.min(max, Math.max(min, value));
  if (center == null) return (v - min) / (max - min);
  return v <= center ? ((v - min) / (center - min)) * 0.5 : 0.5 + ((v - center) / (max - center)) * 0.5;
}

export function sliderSnap(value: number, min: number, max: number, step: number): number {
  // Round away float noise (0.1 + 0.05 = 0.15000000000000002) so labels and stored values stay tidy.
  const snapped = Number((Math.round(value / step) * step).toFixed(6));
  return Math.min(max, Math.max(min, snapped));
}
