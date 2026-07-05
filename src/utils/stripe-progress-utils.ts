/** Build the colors/locations arrays that produce a diagonal stripe pattern in
 * a single LinearGradient. Each period is half-stripe, half-gap with hard
 * transitions (location i === location i+1). */
export function buildStripePattern({
  periods,
  stripeColor,
  gapColor,
}: {
  periods: number;
  stripeColor: string;
  gapColor: string;
}): {
  colors: string[];
  locations: number[];
} {
  const colors: string[] = [];
  const locations: number[] = [];
  const stripeFraction = 0.5 / periods;

  for (let i = 0; i < periods; i++) {
    const start = i / periods;
    const stripeEnd = start + stripeFraction;
    const periodEnd = (i + 1) / periods;
    colors.push(stripeColor);
    locations.push(start);
    colors.push(stripeColor);
    locations.push(stripeEnd);
    colors.push(gapColor);
    locations.push(stripeEnd);
    colors.push(gapColor);
    locations.push(periodEnd);
  }

  return { colors, locations };
}
