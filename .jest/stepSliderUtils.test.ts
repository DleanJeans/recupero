import { clampToStep, stepValue } from '../src/utils/step-slider-utils';

describe('slider utils', () => {
  it('snaps and clamps', () => {
    expect(clampToStep(7.4, 0, 30, 1)).toBe(7);
    expect(clampToStep(-5, 0, 30, 1)).toBe(0);
    expect(clampToStep(99, 0, 30, 1)).toBe(30);
    expect(clampToStep(12, 0, 30, 5)).toBe(10);
  });
  it('steps within bounds', () => {
    expect(stepValue(5, 1, 0, 30, 1)).toBe(6);
    expect(stepValue(0, -1, 0, 30, 1)).toBe(0);
    expect(stepValue(30, 1, 0, 30, 1)).toBe(30);
  });
});
