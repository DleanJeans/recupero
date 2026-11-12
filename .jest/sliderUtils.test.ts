import { sliderRatioOf, sliderSnap, sliderValueAt } from '../src/utils/slider-utils';

describe('icon slider track', () => {
  it('spreads values evenly without a centre', () => {
    expect(sliderValueAt(0.5, -180, 180)).toBe(0);
    expect(sliderRatioOf(90, -180, 180)).toBe(0.75);
  });

  it('puts the centre value at the middle, e.g. 1x zoom between 0.3x and 3x', () => {
    expect(sliderValueAt(0.5, 0.3, 3, 1)).toBe(1);
    expect(sliderValueAt(0, 0.3, 3, 1)).toBe(0.3);
    expect(sliderValueAt(1, 0.3, 3, 1)).toBe(3);
    expect(sliderValueAt(0.75, 0.3, 3, 1)).toBeCloseTo(2);
    expect(sliderRatioOf(1, 0.3, 3, 1)).toBe(0.5);
    expect(sliderRatioOf(2, 0.3, 3, 1)).toBeCloseTo(0.75);
  });

  it('round-trips and clamps off-track values', () => {
    for (const v of [0.3, 0.65, 1, 1.5, 3])
      expect(sliderValueAt(sliderRatioOf(v, 0.3, 3, 1), 0.3, 3, 1)).toBeCloseTo(v);
    expect(sliderRatioOf(5, 0.3, 3, 1)).toBe(1);
    expect(sliderValueAt(-1, 0.3, 3, 1)).toBe(0.3);
  });
});

describe('icon slider steps', () => {
  it('snaps to the step without float noise and stays in range', () => {
    expect(sliderSnap(0.1 + 0.05, 0, 3, 0.05)).toBe(0.15);
    expect(sliderSnap(3.05, 0.3, 3, 0.05)).toBe(3);
    expect(sliderSnap(-5, 0, 100, 5)).toBe(0);
  });
});
